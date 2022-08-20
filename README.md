> ⚠️ Work in progress 

# warc-embed 🏛️
Experimental proxy and wrapper for safely embedding Web Archives (`.warc.gz`, `.wacz`) into web pages. 

This particular implementation, based on [NGINX](https://www.nginx.com/), consists in a [docker-compose setup](https://docs.docker.com/compose/) allowing for quick and easy deployment on a VPS.<br> 
It also benefits from [NGINX's advanced range request caching features](https://www.nginx.com/blog/smart-efficient-byte-range-caching-nginx/). 

> See also: [`warc-embed-netlify`](https://github.com/harvard-lil/warc-embed-netlify)

🖼️ [Live Demo](https://warcembed-demo.matteocargnelutti.dev)

---

## Summary
- [Concept](#concept)
- [Environment Variables](#environment-variables)
- [Routes](#routes)
- [Deployment](#deployment)

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
  src="https://warcembed.domain.ext/?archive-file=archive.warc.gz&archived-url=https://what-was-archived.ext/path"
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

---

## Routes

### /?archive-file=X&archived-url=Y

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
| `archive-file` | Yes | Path + filename of the `.warc.gz` or `.wacz`. Can contain a path. <br>Must either be present in the [`/archives/` folder](/html/archives/) or on the remote server defined by [the `REMOTE_ARCHIVES_SERVER` environment variable](#environment-variables). |
| `archived-url` | Yes | Url of the page that was archived. | 
| `show-location-bar` | No | If set, will show `<replay-web-page>`'s address bar. <br>Particularly useful for multi-page archives.|

#### Examples
```html
<!-- On https://*.domain.ext: -->
<iframe
  src="https://warcembed.domain.ext/?archive-file=archive.warc.gz&archived-url=https://what-was-archived.ext/path"
  allow="allow-scripts allow-modals allow-forms allow-same-origin"
>
</iframe>

<iframe
  src="https://warcembed.domain.ext/?archive-file=/some/folder/archive.warc.gz&archived-url=https://what-was-archived.ext/path&show-location-bar=1"
  allow="allow-scripts allow-modals allow-forms allow-same-origin"
>
</iframe>
```

### /*.[wacz|warc.gz]

### Role
Pulls, caches and serves a given `.warc.gz` or `.wacz` file, with full support for range requests.

Will first look for the path + file given in the local [`/archives/` folder](/html/archives/), and try to proxy it from the remote server defined by [the `REMOTE_ARCHIVES_SERVER` environment variable](#environment-variables).

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
