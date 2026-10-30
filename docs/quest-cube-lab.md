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

## The Quest app: no Mac

`quest/android/` is an Android app for the headset: the pages in a WebView, the cube over the
headset's own Bluetooth. It is the Mac app's window in Android form. `BleBridge.java` speaks the
messages of `mac/Sources/Bridge.swift`, and `shim.js` puts it behind `webkit.messageHandlers.bridge`,
so `js/bridge.js`, the site, the lab and the Quest page run with no change. The app serves the pages
built in (this checkout at build time) at `https://appassets.androidplatform.net/`, a secure context
with its own storage, and opens on a start page: Smart cube lab, Quest cube, Twistwright.

The cost: an Android WebView has no immersive WebXR. The app is a flat window in the room, not a
cube in passthrough. For the cube in 3D, use the Quest Browser with the Mac (above).

```sh
quest/android/build.sh --install     # build, install over adb, open
quest/android/build.sh --open lab/   # open the installed app on a page
quest/android/build.sh --logs        # the app's log and the pages' console
```

The build needs no Gradle and no Android Studio: a JDK 17 (`brew install openjdk@17`) and the SDK
command-line tools (`brew install --cask android-commandlinetools`, then
`sdkmanager "platforms;android-34" "build-tools;34.0.0"`). `chrome://inspect` on the Mac shows the
app's pages while the headset is on adb.

Checked in an Android 14 emulator (no cube there): the start page, the Nearby devices question on
Connect, the scan starting, the lab, the Quest page's WebGL preview, the site with random-state
scrambles from cubing.js. `test/quest.js` drives `shim.js` and `js/bridge.js` with a fake Java side
and a fake GAN cube. The emulator's software GPU gave an empty WebGL picture when the app started
straight on the Quest page; from the start page it drew. Look for that on the headset.

Not yet tried: a GAN cube over Horizon OS Bluetooth (the scan, the connect, the notifications, the
delay of a turn), and the window on the headset.

## Next

1. Run it on a headset; measure the delay from a turn to the picture.
2. Turn the layer from the move message, before the state answer lands.
3. Put the twin by the hand that holds the cube (hand tracking), or over it at 1:1.
4. Run the Quest app with a cube. If Horizon OS Bluetooth reads it well, give `BleBridge` a
   WebSocket on `ws://localhost:27273` as a relay, so the Quest Browser page gets the cube in
   passthrough with no Mac. The open question there: does the relay keep its Bluetooth link while the
   browser is in an immersive session.
