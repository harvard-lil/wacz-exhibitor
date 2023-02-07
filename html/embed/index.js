//------------------------------------------------------------------------------
// Module-level variables
//------------------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const player = document.createElement("replay-web-page");

//------------------------------------------------------------------------------
// Check for required params
//------------------------------------------------------------------------------
if (params.get("source") === null) {
  throw new Error("`source` search param must be provided.");
}

//------------------------------------------------------------------------------
// Prepare and inject `<replay-web-page>`
//------------------------------------------------------------------------------
player.setAttribute("source", `/${params.get("source")}`);
player.setAttribute("replayBase", "/replay-web-page/");
player.setAttribute("embed", "default");
player.setAttribute("requireSubDomainIframe", "");
player.setAttribute("sandbox", "");

// Param: `url` (see: https://replayweb.page/docs/embedding)
if (params.get("url")) {
  player.setAttribute("url", params.get("url"));
}

// Param: `ts` (see: https://replayweb.page/docs/embedding)
if (params.get("ts")) {
  player.setAttribute("ts", handleTsParam(params.get("ts")));
}

// Param: `embed` (see: https://replayweb.page/docs/embedding)
if (["default", "full", "replayonly", "replay-with-info"].includes(params.get("embed"))) {
  player.setAttribute("embed", params.get("embed"));
}

// Param: `deepLink` (see: https://replayweb.page/docs/embedding)
if (params.get("deepLink")) {
  player.setAttribute("deepLink", "");
}

document.querySelector("body").appendChild(player);

//------------------------------------------------------------------------------
// Two-way communication between embedder and embedded
//------------------------------------------------------------------------------
window.addEventListener("message", (event) => {
  //
  // Forward messages coming from the service worker
  //
  try {
    if (event.source.location.pathname === player.getAttribute("replayBase")) {
      parent.window.postMessage(
        { warcEmbedHref: window.location.href, ...event.data },
        "*"
      );
    }
  }
  catch(err) {
    // Will fail on cross-origin messages
  }

  //
  // Handle messages coming from parent
  //
  if (event.source === parent.window && event.data) {

    // `updateUrl`: Updates `<replay-web-page>`s "url" attribute
    if (event.data["updateUrl"]) {
      player.setAttribute("url", event.data.updateUrl);
    }

    // `updateTs` Updates `<replay-web-page>`s "ts" attribute
    if (event.data["updateTs"]) {
      player.setAttribute("ts", handleTsParam(event.data.updateTs));
    }

    // `getInited`: Hoists current value of `<replay-web-page>.__inited`.
    // This value indicates whether or not the service worker is ready.
    if (event.data["getInited"]) {
      parent.window.postMessage(
        { inited: player.__inited, warcEmbedHref: window.location.href },
        event.origin
      );
    }

    // `getCollInfo`
    // Pries into `<replay-web-page>` to hoist `wr-coll.__collInfo`, which contains useful collection-related data.
    if (event.data["getCollInfo"]) {
      let collInfo = {};

      try {
        collInfo = player.shadowRoot
          .querySelector("iframe")
          .contentDocument
          .querySelector("replay-app-main")
          .shadowRoot
          .querySelector("wr-coll")
          .__collInfo;
      }
      catch(err) {
        // console.log(err); // Not blocking | Just not ready.
      }

      parent.window.postMessage(
        { collInfo: collInfo, warcEmbedHref: window.location.href },
        event.origin
      );
    }

  }

}, false);

//------------------------------------------------------------------------------
// Utils
//------------------------------------------------------------------------------
/**
 * Converts `ts` from timestamp to YYYYMMDDHHMMSS if necessary.
 * In `<replay-web-page>`, `ts` can be either depending on context, which can lead to confusions.
 * This function brings support for `ts` as either a timestamp OR a formatted date.
 * 
 * @param {Number|String} ts 
 * @returns {Number} 
 */
function handleTsParam(ts) {
  ts = parseInt(ts);
  
  if (ts <= 9999999999999) {
    const date = new Date(ts);
    let newTs = `${date.getUTCFullYear()}`;
    newTs += `${(date.getUTCMonth() + 1).toString().padStart(2, 0)}`;
    newTs += `${date.getUTCDate().toString().padStart(2, 0)}`;
    newTs += `${date.getUTCHours().toString().padStart(2, 0)}`;
    newTs += `${date.getUTCMinutes().toString().padStart(2, 0)}`;
    newTs += `${date.getSeconds().toString().padStart(2, 0)}`;
    ts = newTs;
  }

  return ts;
}