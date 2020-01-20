# ⚡️ Building polyfill.io using CloudFare Workers

> Polyfill.io is a service which makes web development less frustrating by selectively polyfilling just what the browser needs. Polyfill.io reads the User-Agent header of each request and returns polyfills that are suitable for the requesting browser.

**- From the original repo**

In this repo, I have tried to replicate the same functionality using Cloudfare workers which helps in keeping the code concise and take advantage of the JavaScript ecosystem. The original implementation is done in Node.js + uses Fastly (Varnish scripting) to take full advantage of caching for achieving 99.99% HIT rate. But using CloudFare workers, we can have all the logic in JS rather than in VCL files.

### Basic

👨🏼‍💼[https://polyfill.asvny.workers.dev/\_\_about](https://polyfill.asvny.workers.dev/__about)
<br/>
💉[https://polyfill.asvny.workers.dev/\_\_health](https://polyfill.asvny.workers.dev/__health)

### Combinations

[https://polyfill.asvny.workers.dev/polyfill.js?features=IntersectionObserver,fetch&callback=polyfillsLoaded](https://polyfill.asvny.workers.dev/polyfill.js?features=IntersectionObserver,fetch&callback=polyfillsLoaded)
[https://polyfill.asvny.workers.dev/polyfill.js?callback=polyfillsLoaded&features=IntersectionObserver,fetch](https://polyfill.asvny.workers.dev/polyfill.js?callback=polyfillsLoaded&features=IntersectionObserver,fetch)
[https://polyfill.asvny.workers.dev/polyfill.js?features=fetch,IntersectionObserver&callback=polyfillsLoaded](https://polyfill.asvny.workers.dev/polyfill.js?features=fetch,IntersectionObserver&callback=polyfillsLoaded)
[https://polyfill.asvny.workers.dev/polyfill.js?callback=polyfillsLoaded&features=fetch,IntersectionObserver](https://polyfill.asvny.workers.dev/polyfill.js?callback=polyfillsLoaded&features=fetch,IntersectionObserver)
[https://polyfill.asvny.workers.dev/polyfill.js?features=fetch,IntersectionObserver&callback=polyfillsLoaded&zebra=striped](https://polyfill.asvny.workers.dev/polyfill.js?features=fetch,IntersectionObserver&callback=polyfillsLoaded&zebra=striped)
[https://polyfill.asvny.workers.dev/polyfill.js?features=IntersectionObserver,fetch&callback=polyfillsLoaded&unknown=polyfill](https://polyfill.asvny.workers.dev/polyfill.js?features=IntersectionObserver,fetch&callback=polyfillsLoaded&unknown=polyfill)

### References

[https://jakechampion.name/posts/2017-06-09-improving-the-cache-performance-of-the-polyfill-service/](https://jakechampion.name/posts/2017-06-09-improving-the-cache-performance-of-the-polyfill-service/)
[https://jakechampion.name/posts/improving-the-cache-performance-of-the-polyfill-service-even-more/](https://jakechampion.name/posts/improving-the-cache-performance-of-the-polyfill-service-even-more/)
