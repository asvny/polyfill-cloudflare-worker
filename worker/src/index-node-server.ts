import {} from '@cloudflare/workers-types'
import * as pkg from '../package.json'
import * as UAParser from 'ua-parser-js'

type Flag = Record<string, Array<string>>

interface PolyFillOptions {
  excludes: string[]
  features: Record<string, Flag>
  callback: string | boolean
  unknown: string
  uaString: string
  minify: boolean
  compression: string
}

const HOST = 'https://polyfill-clouldfare-workers.io/'

addEventListener('fetch', (event: FetchEvent) => {
  event.passThroughOnException()

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

  let fetchURL = new URL(request.url)
  fetchURL.host = 'polyfill-io.herokuapp.com'
  fetchURL.pathname = '/v3/' + fetchURL.pathname

  // @ts-ignore
  let cache = caches.default
  let queryParams = getQueryParamsHash(url)

  let {
    excludes = '',
    features = 'default',
    unknown = 'polyfill',
    callback,
    compression,
  } = queryParams
  const minify = url.pathname.endsWith('.min.js')
  const uaString = request.headers.get('User-Agent') || ''

  let json: PolyFillOptions = {
    excludes: excludes ? excludes.split(',') : [],
    features: featuresfromQueryParam(features, queryParams.flags),
    callback: /^[\w\.]+$/.test(callback || '') ? callback : false,
    unknown,
    uaString,
    minify,
    compression,
  }

  let KEY = await generateCacheKey(json)
  let cacheKey = HOST + KEY
  let response = await cache.match(cacheKey)

  try {
    if (!response) {
      response = await fetch(fetchURL.href, {
        headers: {
          'User-Agent': uaString,
        },
        // @ts-ignore
        cf: { cacheKey, cacheEverything: true },
      })

      event.waitUntil(cache.put(cacheKey, response.clone()))
    }

    let ifNoneMatch = request.headers.get('if-none-match')
    let cachedEtag = response.headers.get('etag')

    if (ifNoneMatch == cachedEtag) {
      return new Response(null, { status: 304 })
    }

    return response
  } catch (err) {
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

function getQueryParamsHash(url: URL) {
  let queryParams: Record<string, string> = {}
  // @ts-ignore
  for (let [key, value] of url.searchParams.entries()) {
    queryParams[key] = value
  }

  return queryParams
}

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

function normalizeUA(uaString: string): string {
  const ua = new UAParser(uaString).getResult()
  const family = ua.browser.name || 'Unknown'
  const [major = 0, minor = 0] = ua.browser.version
    ? ua.browser.version.split('.')
    : [0, 0]

  return `${family}#${major}#${minor}`
}

/// Utils

function uniqueArray<T extends string, int>(array: T[]): T[] {
  return [...new Set(array)]
}

async function hash(object: object): Promise<string> {
  const msgBuffer = new TextEncoder().encode(JSON.stringify(object))
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)

  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')

  return hashHex
}
