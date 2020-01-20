const fs = require("fs")
const util = require("util")
const path = require("path")
const globby = require("globby")
const split = require("just-split")
const fetch = require('node-fetch');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const POLYFILLS_PATH = __dirname + './node_modules/polyfill-library/polyfills/__dist/'
const CLOUDFLARE_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/`

/**
 * 
 * @param {string} folderPath - Folder path of the required files
 * @param {Array} slicer - Substring the filename string to get the feature name
 * @param {string} fileName - Output file name
 */
async function getArrayfromPath(folderPath, slicer, fileName) {
  let files = await globby(path.join(POLYFILLS_PATH + folderPath));
  let array = [];
  let output = Object.create(null);

  for await (let file of files) {
    let content = await readFile(file, 'UTF-8');
    let key = file.slice(...slicer)

    output[key] = content;
    array.push({ key, value: content });
  }

  await writeFile(fileName, JSON.stringify(output, null, 4))

  return array;
}

/**
 * 
 * @param {Array} array - Key-value pairs of the polyfill content
 * @param {string} namespace - Namespace of the Cloudflare KV storage
 */
async function populateToCloudflare(array, namespace) {
  return fetch(CLOUDFLARE_ENDPOINT + `storage/kv/namespaces/${namespace}/bulk`, {
    method: 'PUT',
    body: JSON.stringify(array),
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': process.env.EMAIL,
      'X-Auth-Key': process.env.AUTH_KEY
    },
  })
}

async function main() {
  try {
    let tomlArray = await getArrayfromPath('./**/meta.toml', [49, -10], 'tomls.json');
    let minifiedArray = await getArrayfromPath('./**/min.js', [49, -7], 'minified.json');

    /**
     *  We need to split into multiple chunks because the above arrays can
     *  have around 1000+ elements in it
     */
    let tomlChunks = split(tomlArray, 50);
    let minifiedChunks = split(minifiedArray, 50);

    // Send 50 elements as payload in a single API request and parallelize it
    let tomlPromises = tomlChunks.map(arr => populateToCloudflare(arr, "69979c9409a24636b4e05709e367bc41"))
    let minifiedPromises = minifiedChunks.map(arr => populateToCloudflare(arr, "e1acc199504c4bff9593c8d55342902c"))

    await Promise.all(tomlPromises, minifiedPromises)
  } catch (err) {
    throw err;
  }
}

try {
  main()
} catch (err) {
  console.error('[popular-cloudflare-kv] There was an error while trying to populate \n', err)
}