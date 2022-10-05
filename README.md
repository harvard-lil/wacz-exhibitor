# warc-embed 🏛️
Experimental proxy and wrapper boilerplate for safely and efficiently embedding Web Archives (`.warc.gz`, `.wacz`) into web pages. 

This particular implementation:
- Wraps [Webrecorder's `<replay-web-page>`](https://replayweb.page/docs/embedding) client-side playback technology.
- Serve, proxies and [cache](https://www.nginx.com/blog/smart-efficient-byte-range-caching-nginx/) web archive files using [NGINX](https://www.nginx.com/). Implementation consists in a [docker-compose setup](https://docs.docker.com/compose/), allowing for quick and easy deployment on a VPS.

🖼️ [Live Demo](https://warcembed-demo.lil.tools)

📖 See also: [Blog post](https://lil.law.harvard.edu/blog/2022/09/15/opportunities-and-challenges-of-client-side-playback/ "Blog post on lil.law.harvard.edu - Web Archiving: Opportunities and Challenges of Client-Side Playback")

---

## Summary
- [Concept](#concept)
- [Environment Variables](#environment-variables)
- [Routes](#routes)
- [Communicating with the embedded archive](#communicating-with-the-embedded-archive)
- [Deployment](#deployment)
- [Changelog](/CHANGELOG.md)

---

## Concept

### "It's a wrapper"
`warc-embed` serves an HTML document containing a pre-configured instance of [`<replay-web-page>`](https://replayweb.page/), [webrecorder's front-end archive playback system](https://webrecorder.net/), pointing at a proxied version of the requested archive. 

The playback will only start when said document is embedded in a cross-origin `<iframe>` for security reasons _(XSS prevention in the context of an `<iframe>` needing both `allow-script` and `allow-same-origin`)_.  

### "It's a proxy"
`warc-embed` pulls and serves the requested archive file in the format required by `<replay-web-page>` _(right [`Content-Type`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type), support for [range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests), CORS resolution)_.  

**The requested archive can be sourced from either:**
- The local [`/archives/` folder](/html/archives/). This is where the server will look first.
- A remote location the server will proxy from, defined by the [`REMOTE_ARCHIVES_SERVER` environment variable](#environment-variables).

### Example 
```html
<!-- On https://*.domain.ext: -->
<iframe
  src="https://warcembed.domain.ext/?source=archive.warc.gz&url=https://what-was-archived.ext/path"
  allow="allow-scripts allow-modals allow-forms allow-same-origin"
>
</iframe>
```

[☝️ Back to summary](#summary)

---

## Environment variables

These environment variables are used by `docker-compose` to replace values in `nginx/default.conf.template`. 

| Name | Required | Description |
| --- | --- | --- |
| `HOST_NAME` | Yes | Host name of the deployed instance of `warc-embed`. Ex: `warcembed.example.com`. |
| `REMOTE_ARCHIVES_SERVER` | Yes | Remote location to fetch archives from when not present locally. Ex: `https://warcserver.example.com` |

[☝️ Back to summary](#summary)

---

## Routes

### /?source=X&url=Y

#### Role
Serves [an HTML document containing an instance of `<replay-web-page>`](/html/embed/index.html), pointing at a proxied archive file. 

Must be embedded in a cross-origin `<iframe>`, preferably on the same parent domain to avoid thrid-party cookie limitations:
```
warcembed.example.com: Hosts warc-embed
www.example.com: Has iframes pointing at warcembed.example.com
```

#### Methods
`GET`, `HEAD`

#### Query parameters
| Name | Required ? | Description |
| --- | --- | --- |
| `source` | Yes | Path + filename of the `.warc.gz` or `.wacz`. Can contain a path. <br>Must either be present in the [`/archives/` folder](/html/archives/) or on the remote server defined by [the `REMOTE_ARCHIVES_SERVER` environment variable](#environment-variables). |
| `url` | No | Url of a page within the archive to display. If not set, will try to open the first page available. | 
| `ts`| No | Timestamp of the page to retrieve. Can be either a YYYYMMDDHHMMSS-formatted string or a millisecond timestamp or a. |
| `embed` | No | `<replay-web-page>`'s [embed mode](https://replayweb.page/docs/embedding). Can be set to `replayonly` to hide its UI. |
| `deepLink` | No | `<replay-web-page>`'s [`deepLink` mode](https://replayweb.page/docs/embedding). |

#### Examples
```html
<!-- On https://*.domain.ext: -->
<iframe
  src="https://warcembed.domain.ext/?source=archive.warc.gz&url=https://what-was-archived.ext/path"
  allow="allow-scripts allow-modals allow-forms allow-same-origin"
>
</iframe>
```

### /*.[wacz|warc.gz]

### Role
Pulls, caches and serves a given `.warc.gz` or `.wacz` file, with full support for range requests.

Will first look for the path + file given in the local [`/archives/` folder](/html/archives/), and try to proxy it from the remote server defined by [the `REMOTE_ARCHIVES_SERVER` environment variable](#environment-variables).

[☝️ Back to summary](#summary)

---

## Communicating with the embedded archive

`warc-embed` allows the embedding website to communicate with the embedded archive playback using [post messages](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage). 
All messages coming _from_ a `warc-embed` `<iframe>` come with a `warcEmbedHref` property, helping identify the sender.  

### Messages interpreted by the `warc-embed` `<iframe>`
`warc-embed` will look for the following properties in messages coming from the embedding website and react accordingly:

| Property name | Expected value | Description |
| --- | --- | --- |
| `updateUrl` | String | If provided, will replace the current `url` parameter of `<replay-web-page>`. |
| `updateTs` | Number | If provided, will replace the current `ts` parameter of `<replay-web-page>`. |
| `getCollInfo` | Boolean | If provided, will send a post message back with `<replay-web-page>`'s `collInfo` object, containing meta information about the currently-loaded archive. |
| `getInited` | Boolean | If provided, will send a post message back with the current value of `<replay-web-page>`s `inited` property, indicating whether or not the service worker is ready. | 

### Messages hoisted from `<replay-web-page>`
`warc-embed` will forward to the embedding website every post message sent by `<replay-web-page>`'s service worker. 

The most common example is the following, which is sent during navigation within an archive:

```json
{
  "warcEmbedHref": "https://warcembed.domain.ext/?source=archive.warc.gz&url=https://what-was-archived.ext/path",
  "url": "https://what-was-archived.ext/new-path/",
  "view": "pages",
  "ts": "20220816162527"
}
```

### Example: Intercepting messages from a `warc-embed` `<iframe>`
```javascript
// Assuming: there's only 1 <iframe class="warc-embed">  
const playback = document.querySelector("iframe.warc-embed");

window.addEventListener("message", (e) => {
  // This message bears data and comes from the `warc-embed` <iframe>
  if (event?.data && event.source === playback.contentWindow) {
    console.log(event);
  }
});
```

### Example: Sending a message to a `warc-embed` `<iframe>`
```javascript
// Assuming: there's only 1 <iframe class="warc-embed">  
const playback = document.querySelector("iframe.warc-embed");
const playbackOrigin = new URL(playback.src).origin;

playback.contentWindow.postMessage(
  {"setUrl": "https://lil.law.harvard.edu/projects"},
  playbackOrigin
);
```

[☝️ Back to summary](#summary)

---

## Deployment
The following quick start checklist will describe one of the many ways this setup could be deployed on a VPS.

**Pre requisites:** 
- A Linux VPS with support for `docker-compose`.
- A DNS record for a subdomain pointing at your server, for example for `warcembed.example.com`.

**Checklist:**
1. Clone this repository.
2. Make a temporary copy of `.env.example` and edit it: `cp .env.example .env && nano .env` _(See [environment variables](#environment-variables))_.
3. Start the server: `bash first-start.sh`
4. Run `bash make-cert-dry-run.sh` to make sure an [Let's Encrypt](https://letsencrypt.org/) can generate a certificate for your setup.
5. If everything went right, run `bash make-and-use-cert.sh` to actually generate the certificate and alter NGINX's configuration.
6. You're live! The certificate will need to be regenerated every three months: the `renew-certificate.sh` may help with that task. 

**Note:** Although it doesn't contain any non-public / sensitive information, we encourage you to avoid keeping `.env` around in a production setting.<br>
After initial setup, it may be safely discarded if replaced by actual environment variables.

[☝️ Back to summary](#summary)
