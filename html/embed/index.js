//------------------------------------------------------------------------------
// Type definitions
//------------------------------------------------------------------------------
/**
 * @typedef {Object} HTMLAttributeOverride
 * @property {string} selector - CSS selector for the target HTML element
 * @property {string} attributeName - the name of the HTML attribute to apply to the target
 * @property {string} attributeContents - the value of the HTML attribute to apply to the target
 */

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
        { waczExhibitorHref: window.location.href, ...event.data },
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
        { inited: player.__inited, waczExhibitorHref: window.location.href },
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
        { collInfo: collInfo, waczExhibitorHref: window.location.href },
        event.origin
      );
    }

    // `overrideElementAttribute`
    //
    // Allows hosts to improve specific playback experiences
    // by altering the attributes of a targeted HTML element in the playback.
    //
    // Pries into `<replay-web-page>`, retrieves the element with the specified selector,
    // and applies the requested attribute.
    //
    // Delegates to the async helper function overrideElementAttribute
    if (event.data["overrideElementAttribute"]) {
      overrideElementAttribute(
        event.origin,
        player,
        parent,
        {
          selector: event.data["overrideElementAttribute"]["selector"],
          attributeName: event.data["overrideElementAttribute"]["attributeName"],
          attributeContents: event.data["overrideElementAttribute"]["attributeContents"]
        }
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

/**
 * To be thrown whenever `waitForElement` fails to find an element after exhausting all allowed retries.
 */
class WaitForElementTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
    this.timeOutError = true;
  }
}

/**
 * Waits for a given element to be in the DOM and returns it.
 * Wait is based on `requestAnimationFrame`: timeout is approximately 60 seconds (60 x 60 frames per seconds).
 *
 * @param {function} selectorFunction - Function to be run to find the element.
 * @returns {Promise<HTMLElement>} Reference to the element that was found.
 */
async function waitForElement(selectorFunction) {
  const maxPauseSeconds = 60;
  let tries = maxPauseSeconds * 60;  // we expect a repaint rate of ~60 times a second, per https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
  let elem = null;

  while (!elem && tries > 0) {
    // Sleep efficiently until the next repaint
    const pause = await new Promise(resolve => requestAnimationFrame(resolve));
    cancelAnimationFrame(pause);

    // Look for the target element
    try {
      elem = selectorFunction();
    }
    catch (err) {
      if (!err.message.includes('null')) {
        throw err;
      }
    }
    if (!elem) {
      tries -= 1;
    }
  }

  if (elem) {
    return elem;
  }

  throw new WaitForElementTimeoutError(`Did not find element in ${maxPauseSeconds}s`);
}

/**
 * Async helper function for handling `overrideElementAttribute` messages.
 * Posts `overrideElementAttribute` back to the parent frame on failure.
 *
 * @param {string} origin - The origin of the posted message (see: https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/origin).
 * @param {HTMLElement} player - The <replay-web-page> element.
 * @param {Window} parent - https://developer.mozilla.org/en-US/docs/Web/API/Window/parent
 * @param {HTMLAttributeOverride} overrideElementAttribute - Specifies which HTML element to change, and how.
 * @returns {Promise<void>}
 */
async function overrideElementAttribute(origin, player, parent, overrideElementAttribute) {
  const { selector, attributeName, attributeContents } = overrideElementAttribute;
  try {
    const targetElem = await waitForElement(() => {
      return player.shadowRoot
        .querySelector('iframe')
        .contentDocument
        .querySelector('replay-app-main')
        .shadowRoot
        .querySelector('wr-coll')
        .shadowRoot
        .querySelector('wr-coll-replay')
        .shadowRoot
        .querySelector('iframe')
        .contentDocument
        .querySelector(selector);
    })
    targetElem.setAttribute(attributeName, attributeContents);
  }
  catch(err) {
    if (!('timeOutError' in err)) {
      throw err;
    }
    parent.window.postMessage(
      {"overrideElementAttribute": {
        "status": "timed out",
        "request": overrideElementAttribute,
        waczExhibitorHref: window.location.href
      }},
      origin
    );
  }
}
