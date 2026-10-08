//------------------------------------------------------------------------------
// Deployment settings
//------------------------------------------------------------------------------
/**
 * Where a relative `source` is read from, by the end of its path.
 *
 * Each entry is `[suffix, origin]`: a relative `source` whose path ends with
 * `suffix` is read from `origin` + "/" + `source`, which is what the bundled
 * NGINX configuration's remote proxy does for `.warc` and `.wacz` paths. The
 * first matching entry wins; with no match, or with this list empty (the
 * default), the archive is read from this player's own origin.
 *
 * This lets a deployment without a proxy accept the same `source` values as
 * one with it, e.g.:
 *
 *   [[".wacz", "https://my-waczs.s3.amazonaws.com"],
 *    [".warc.gz", "https://my-warcs.s3.amazonaws.com"]]
 *
 * Each origin must also be allowed by the `connect-src` of the player's
 * Content-Security-Policy, which is what decides which archives can be read.
 *
 * @type {Array<[string, string]>}
 */
export const relativeSourceOrigins = [];
