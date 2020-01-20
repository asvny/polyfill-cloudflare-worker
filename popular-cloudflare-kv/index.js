require('dotenv').config();

const fs = require("fs")
const util = require("util")
const path = require("path")
const globby = require("globby")
const split = require("just-split")
const fetch = require('node-fetch');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const POLYFILLS_PATH = __dirname + '/node_modules/polyfill-library/polyfills/__dist/'
const CLOUDFLARE_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/`

/**
 * 
 * @param {string} folderPath - Folder path of the required files
 * @param {string} fileName - Output file name
 * @param {Function} transformer - Transform the content file to meaning ones
 */
async function getArrayfromPath(folderPath, fileName, transformer = (a) => a) {
  let files = await globby(path.join(POLYFILLS_PATH + folderPath));
  let array = [];
  let output = Object.create(null);

  for await (let file of files) {
    let content = await readFile(file, 'UTF-8');
    let [key] = file.split('/').slice(-2, -1);

    content = transformer(content);
    output[key] = content;
    array.push({ key, value: content });
  }

  await writeFile(fileName, JSON.stringify({ data: output }, null, 4))

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
    let tomlArray = await getArrayfromPath('./**/meta.toml', 'tomls.json');
    let minifiedArray = await getArrayfromPath('./**/min.js', 'polyfill-scripts.json');

    /**
     *  We need to split into multiple chunks because the above arrays can
     *  have around 1000+ elements in it
     */
    let tomlChunks = split(tomlArray, 50);
    let minifiedChunks = split(minifiedArray, 50);

    // Send 50 elements as payload in a single API request and parallelize it
    let tomlPromises = tomlChunks.map(arr => populateToCloudflare(arr, "689dd5adf0e54b0e9aec29844a337351"))
    let minifiedPromises = minifiedChunks.map(arr => populateToCloudflare(arr, "c0dfbe8a7d3f4d7196a75d4dbe4bf63f"))

    let responses = await Promise.all(tomlPromises, minifiedPromises)
    let isSuccess = responses.every(response => response.status === 200);

    if (isSuccess) {
      console.log("TOMLs and Scripts were successfully populated to the Cloudflare KV")
    } else {
      throw new Error("Some request failed with a wrong status code")
    }
  } catch (err) {
    throw err;
  }
}


main()
  .catch(error => {
    console.error('[popular-cloudflare-kv] There was an error while trying to populate \n', error)
  })

