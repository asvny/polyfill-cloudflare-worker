import {} from '@cloudflare/workers-types'
import * as pkg from '../package.json'
import * as polyfillLibrary from 'polyfill-library'
import * as UAParser from 'ua-parser-js'

type Flag = Record<string, Array<string>>

interface PolyFillOptions {
  excludes: string[]
  features: Record<string, Flag>
  callback: string | boolean
  unknown: string
  uaString: string
  minify: boolean
}

/**
 *  The cache key should either be a request object or URL string,
 *  so we prepend this HOST with the hash of PolyFillOptions object
 *
 *  Eg: https://polyfill-clouldfare-workers.io/85882a4fec517308a70185bd12766577bef3e42b
 */
const HOST = 'https://polyfill-clouldfare-workers.io/'

addEventListener('fetch', (event: FetchEvent) => {
  let url = new URL(event.request.url)
  let page = url.pathname.slice(1)
  let isPolyFillRoute = page.startsWith('polyfill.')

  switch (page) {
    case '__about': {
      event.respondWith(handleAbout(event.request))
      break
    }

    case '__health': {
      event.respondWith(handleHealth(event.request))
      break
    }

    default: {
      if (!isPolyFillRoute) {
        event.respondWith(handleDefault(event.request))
        break
      }

      event.respondWith(handlePolyfill(event.request, event))
    }
  }
})

async function handlePolyfill(
  request: Request,
  event: FetchEvent,
): Promise<Response> {
  let url = new URL(request.url)
  // @ts-ignore
  let cache = caches.default
  // Get query params from the URL object and store as key-value object
  let queryParams = getQueryParamsHash(url)

  let {
    excludes = '',
    features = 'default',
    unknown = 'polyfill',
    callback,
  } = queryParams
  // By default, now it supports only with minification
  const minify = url.pathname.endsWith('.min.js')
  const uaString = request.headers.get('User-Agent') || ''

  // Sort the keys and also the values and have it in same shape
  let json: PolyFillOptions = {
    excludes: excludes
      ? excludes.split(',').sort((a, b) => a.localeCompare(b))
      : [],
    features: featuresfromQueryParam(features, queryParams.flags),
    callback: /^[\w\.]+$/.test(callback || '') ? callback : false,
    unknown,
    uaString,
    minify,
  }

  // Default headers for serving the polyfill js file
  const headers = {
    'cache-control':
      'public, s-maxage=31536000, max-age=604800, stale-while-revalidate=604800, stale-if-error=604800', // one-month
    'content-type': 'application/javascript',
  }
  // Get SHA-1 of json object
  let KEY = await generateCacheKey(json)
  // Since cache API expects first argument to be either Request or URL string,
  // so prepend a dummy host
  let cacheKey = HOST + KEY
  // Get the cached response for given key
  let response = await cache.match(cacheKey)

  try {
    if (!response) {
      /**
       *  If there is no cached response, generate the polyfill string
       *  for the input object, the json object params can be
       *  polyfill-library README file.
       */
      let polyfillString = await getPolyfillBundle(json)

      /**
       *  Construct a response object with default headers and append a
       *  ETag header, so that for repeated requests, it can be checked
       *  with If-None-Match header to respond immediately with a 304
       *  Not Modified response
       */
      response = new Response(polyfillString, {
        headers: {
          ...headers,
          ETag: `W/"${KEY}"`,
        },
      })

      // Store the response in the response without blocking execution
      event.waitUntil(cache.put(cacheKey, response.clone()))
    }

    /**
     *   Check if cached response's ETag value and current request's
     *   If-None-Match value are equal or not, if true respond
     *   with a 304 Not Modified response
     */
    let ifNoneMatch = request.headers.get('if-none-match')
    let cachedEtag = response.headers.get('etag')
    if (ifNoneMatch == cachedEtag) {
      return new Response(null, { status: 304 })
    }

    // Finally, send the response
    return response
  } catch (err) {
    // If in case of error, respond the error message with error status code
    const stack = JSON.stringify(err.stack) || err
    return new Response(stack, { status: 500 })
  }
}

function handleAbout(request: Request): Response {
  let about = {
    name: pkg.name,
    purpose: pkg.description,
    author: pkg.author,
    info: 'Made with ❤️ in Melbourne',
  }

  return new Response(JSON.stringify(about, null, 2), { status: 200 })
}

function handleHealth(request: Request): Response {
  let health = {
    name: pkg.name,
    purpose: pkg.description,
    checks: 'Ok!',
  }

  return new Response(JSON.stringify(health, null, 2), { status: 200 })
}

function handleDefault(request: Request): Response {
  return new Response(
    `This route doesn't exist.Please check the polyfill.io documentation as a reference for this website`,
    { status: 404 },
  )
}

// Sort features along with the flags (always, gated) as a JavaScript object
function featuresfromQueryParam(
  features: string,
  flags: string,
): Record<string, Flag> {
  let flagsArray = flags ? flags.split(',') : []
  let featuresArray = features
    .split(',')
    .filter(x => x.length)
    .map(x => x.replace(/[\*\/]/g, ''))

  return featuresArray.sort().reduce((obj, feature) => {
    const [name, ...featureSpecificFlags] = feature.split('|')
    obj[name] = {
      flags: uniqueArray([...featureSpecificFlags, ...flagsArray]),
    }
    return obj
  }, {} as Record<string, Flag>)
}

// Generate the polyfill source
async function getPolyfillBundle(json: object): Promise<string> {
  return polyfillLibrary.getPolyfillString(json)
}

// Make key-value pairs object from the URL object
function getQueryParamsHash(url: URL) {
  let queryParams: Record<string, string> = {}
  // @ts-ignore
  for (let [key, value] of url.searchParams.entries()) {
    queryParams[key] = value
  }

  return queryParams
}

// Generate hash string which is used to store in cache and also as ETag header value
async function generateCacheKey(opts: PolyFillOptions): Promise<string> {
  let seed = {
    excludes: opts.excludes,
    features: opts.features,
    callback: opts.callback,
    unknown: opts.unknown,
    uaString: normalizeUA(opts.uaString),
  }
  let hashString = await hash(seed)

  return hashString
}

// Normalize the user agent string, we consider only the browser family, major and minor version
function normalizeUA(uaString: string): string {
  const ua = new UAParser(uaString).getResult()
  const family = ua.browser.name || 'Unknown'
  const [major = 0, minor = 0] = ua.browser.version
    ? ua.browser.version.split('.')
    : [0, 0]

  return `${family}#${major}#${minor}`
}

// Utils

// Get the unique values of an array
function uniqueArray<T extends string, int>(array: T[]): T[] {
  return [...new Set(array)]
}

// Generate a SHA-1 hash for a given javascript object
async function hash(object: object): Promise<string> {
  const msgBuffer = new TextEncoder().encode(JSON.stringify(object))
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)

  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')

  return hashHex
}
