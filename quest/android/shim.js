// The Quest app's bridge in the shape of the macOS app's: js/bridge.js looks for
// webkit.messageHandlers.bridge, and in the Mac app's window that is a WKWebView message handler.
// In the Quest app (quest/android/) the page runs in an Android WebView, and the Java side is the
// object TwistwrightAndroid (BleBridge.java). post(json) takes one message; it answers hello with
// {version, bluetooth} as text and every other message with nothing. The app sends each event
// back through window.bridgeEvent(m), as the Mac app does. The app puts this script first in the
// head of every page it serves, so it runs before bridge.js.
(function(){
  var A=window.TwistwrightAndroid;
  if(!A||typeof A.post!=='function')return;
  window.webkit=window.webkit||{};
  window.webkit.messageHandlers=window.webkit.messageHandlers||{};
  window.webkit.messageHandlers.bridge={postMessage:function(m){
    var r=A.post(JSON.stringify(m));
    return Promise.resolve(r?JSON.parse(r):undefined);
  }};
})();
