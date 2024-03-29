## v0.1.0 - Jun 22 2023
- Changelog moved to release notes on GitHub 👋

---

## v0.0.12 - Jun 15 2023
- Updated to `<replay-web-page>` 1.8.0

---

## v0.0.11 - Jun 02 2023
- Updated to `<replay-web-page>` 1.7.15

---

## v0.0.10 - Apr 19 2023
- Added (experimental) Content Security Policy to prevent potential service worker leaks.

---

## v0.0.9 - Apr 06 2023 
- Upgraded to `<replay-web-page>` 1.7.14

---

## v0.0.8 - Feb 27 2023 
- Comments fix in `nginx.conf`
- Upgraded to `<replay-web-page>` 1.7.13

---

## v0.0.7 - Feb 07 2023 
- Allow `?url` to remain unspecified to match `<replay-web-page>`'s behavior.

---

## v0.0.6 - Feb 03 2023 
- Upgraded to `<replay-web-page>` 1.7.12 

---

## v0.0.5 - Jan 16 2023 
- Upgraded to `<replay-web-page>` 1.7.11 
- Added support for `.warc`

---

## v0.0.4 - Dec 19 2022
- Upgraded to `<replay-web-page>` 1.7.9 

---

## v0.0.3 - Dec 05 2022
- Upgraded to `<replay-web-page>` 1.7.7 

---

## v0.0.2 - Oct 11 2022
- Moved from `docker-compose` to a single, more generic and hopefully universal `Dockerfile`.
- Updated `README.md` accordingly
- Upgraded to `<replay-web-page>` 1.7.1

---

## v0.0.1 - Oct 05 2022 
- Implemented two-way communication system using post messages (see readme).
- Upgraded to `<replay-web-page>` 1.7.0
- Aligned parameter names with `<replay-web-page>` attribute names:
  - `?archive-file` > `?source`
  - `?archived-url` > `?url`
- Made `?url` parameter optional. Will fallback to `page:0` if not provided.
- Added support for `?ts`, `?embed` and `?deepLink` parameters.
- Removed logic to automatically append `noCache` for browsers that do not support the `StorageManager.estimate` API, now handled by `<replay-web-page>` directly.
- Removed logic to automatically append `noWebWorker` for older versions of Safari (< 16), now handled by `<replay-web-page>` directly.
- Removed logic for checking if `<replay-web-page>` is embedded in a cross-origin `<iframe>`, now handled by `<replay-web-page requireSubDomainIframe>`.
- Used `<replay-web-page>`'s' `sandbox` attribute in replacement of `noSandbox`.
