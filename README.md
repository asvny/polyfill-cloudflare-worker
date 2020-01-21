# ⚡️ Replicating Polyfill.io using Cloudflare Worker

Blogpost : [https://blog.annamalai.me/posts/replicating-polyfill.io-using-cloudflare-workers/](https://blog.annamalai.me/posts/replicating-polyfill.io-using-cloudflare-workers/)

Polyfill worker - `https://polyfill.asvny.workers.dev`
<br/>
Polyfill worker + Node.js - `https://polyfill-with-node.asvny.workers.dev`

## About The Project

A side post on how to implement the same functionality of Polyfill.io using Cloudflare Worker and Cloudflare KV Storage.
> Please don't use this in production .. it is not as fast as original polyfill.io

### Worker
In this folder, the `index.ts` file contains the worker code which generates the polyfill string by itself and `index-node-server.ts` contains the worker code which fetches from upstream origin Node.js server when there is no cached response.

### Populate-Cloudflare-KV
It contains a Node.js script which helps to populate the `TOML` and `script` to the store by calling the Cloudflare Bulk API endpoint.

### Polyfill-library
It is a fork of [polyfill-library](https://github.com/Financial-Times/polyfill-library) , I have made some changes so that it can adapt and worker in Cloudflare worker environment. This needs to be optimised further because it quite slow as of now and sometimes it takes a couple of seconds to generate the polyfill sourcee.

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## License

Distributed under the MIT License. See `LICENSE` for more information.


## Contact

Annamalai - [@asvny_](https://twitter.com/asvny_)

Project Link: [https://github.com/asvny/polyfill-cloudflare-worker](https://github.com/asvny/polyfill-cloudflare-worker)


## Author
Annamalai Saravanan
