# Quest cube lab

The smart cube lab's live cube on a Meta Quest 3: `quest/index.html`, started with `quest/run.sh`.

- Architecture: https://claude.ai/artifact/525c7hhUHiwiv6qmCHf8h7
- Setup guide (Developer Mode, adb, the first session): https://claude.ai/artifact/DPxUXLhYHhbrMVg1GLxASJ

## In short

The Quest Browser has WebXR but no Web Bluetooth. The Twistwright app for macOS reads the cube, as
it does for Safari, and the headset reaches the Mac through `adb reverse`: `localhost:27272` on the
Quest is the app's page server, `localhost:27273` its bridge. `localhost` is a secure context, so
WebXR runs over plain http, and the bridge's origin check (`http://localhost:27272`) passes with no
change to the app.

The page draws with WebGL 2 and no library. `quest/core.js` is pure and `test/quest.js` checks that
every face move's layer turn lands on the next state, then drives the page over the fake bridge and
a fake WebXR session.

## Next

1. Run it on a headset; measure the delay from a turn to the picture.
2. Turn the layer from the move message, before the state answer lands.
3. Put the twin by the hand that holds the cube (hand tracking), or over it at 1:1.
4. Spike a relay app on the headset (Android Bluetooth, the `Bridge.swift` protocol on
   `ws://localhost:27273`) to drop the Mac. An Android WebView has no immersive WebXR, so a wrapper
   app in the shape of the macOS app does not work here.
