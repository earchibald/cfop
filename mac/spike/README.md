# Twistwright Spike

A throwaway Mac app. It answers the open questions of the native app concept before the real work
starts. It is not the new app, and nothing ships from here. Delete `mac/spike/` once the results
are written down.

The concept: the menu bar bridge in `mac/` becomes a normal Mac app with one window. A `WKWebView`
shows the site from the app bundle, and the Bluetooth bridge runs in the same process. The spike
tests the WebKit side of that plan. It has no Bluetooth code.

## Build and run

You need macOS 14 or later, the Xcode command line tools (`swiftc`, `codesign`) and Node (for
`scripts/vendor.js`).

```sh
mac/spike/build.sh --run
```

The build signs ad hoc with the hardened runtime and the camera and microphone entitlements in
`Spike.entitlements`. To see the app's log lines, start the binary from a terminal:

```sh
mac/spike/build/TwistwrightSpike.app/Contents/MacOS/TwistwrightSpike
```

Each ad hoc build has a new signature. macOS can ask for the camera and the microphone again after a
rebuild.

## What the window shows

The window opens the probe page at `/spike/`. The same folder also holds the site from this
checkout (at `/`) and the lab (at `/lab/`). The Spike menu opens each one.

The Spike menu also picks the origin. The choice stays for the next launch.

| Origin | Address | Served by |
| --- | --- | --- |
| Custom scheme | `twistwright://app/` | `SchemeHandler`, a `WKURLSchemeHandler` (`Sources/Files.swift`) |
| Loopback | `http://127.0.0.1:<port>/`, a new port each launch | `LoopbackServer`, an HTTP server on a port the system picks |

Each origin has its own storage. Run the probe at both origins.

## The tests

The probe runs the automatic tests when it opens. Press the button on each row of the second table
for the other tests.

| Row | Question | What a pass means |
| --- | --- | --- |
| Secure context | Is the origin a secure context? | The camera, the microphone and the clipboard can work |
| Web APIs | Which APIs does the page see? | Information only |
| User agent | Can the page tell it is in the app? | The site can hide the download of the Mac app |
| localStorage | Does it outlive a quit? | The saved history (`cw:` keys) survives a relaunch |
| IndexedDB | Does it outlive a quit? | The same, for IndexedDB |
| fetch | Does `fetch()` read a file at this origin? | |
| Dynamic import | Does `import()` load a module? | `js/scramble.js` can load cubing.js |
| Module worker | Does a module worker load, with an import of its own? | The cubing.js search worker can start |
| Blob worker | Does a worker from a blob URL run? | |
| cubing.js | Does a 3x3 random-state scramble come back? | Random-state scrambles work in the app |
| Bridge: page to app | 200 round trips through `webkit.messageHandlers` | The cube's writes can go this way. The detail gives the median time |
| Bridge: app to page | 500 events through `callAsyncJavaScript`, in order? | The cube's values can come this way |
| Camera | Does `getUserMedia` reach the camera? | Scan my cube works |
| Microphone | Does `getUserMedia` reach the microphone? | Listen can hear |
| Speech recognition | Does `webkitSpeechRecognition` give a result? | Listen works with no native speech bridge |
| Clipboard | Does `navigator.clipboard` write and read? | Copy state works |
| Paste | Does Cmd+V reach the page? | The Edit menu works. Use the box at the foot of the page |
| Download | Does an `a[download]` of a blob save a file? | Save image and Save data work |
| Link out | Does a `target="_blank"` link open the default browser? | The footer link works |
| Dialogs | Does `confirm()` show a dialog? | The site's confirm prompts work |
| File input | Does `<input type="file">` open a panel? | |

## Test steps

1. Build and open the app. The probe opens at the custom scheme.
2. Press each button in the second table. Allow the camera and the microphone when macOS asks.
3. Quit with Cmd+Q. Open the app again. The localStorage and IndexedDB rows must now pass.
4. Choose Spike > Loopback. Do steps 2 and 3 again at that origin.
5. At each origin, open the site (Spike > Open the site) and check by hand:
   - The scramble is a random-state scramble. Settings shows the scramble library as ready.
   - Scan my cube shows the camera.
   - Listen on the Reference tab hears a case name.
   - Save image saves a PNG. Copy state puts the letters on the clipboard.
   - A paste of state letters on the page loads the state.
6. Choose Spike > Copy the reports. Paste the result into the concept doc, with the notes from step 5.

Spike > Clear website data and reload starts the storage tests again. The app also writes each
report to `~/Library/Application Support/TwistwrightSpike/`.

## What the results decide

- **The custom scheme passes Secure context, both storage rows, Module worker and cubing.js:** build
  the real app on the custom scheme with the message handler bridge (option B). No port opens.
- **The custom scheme fails one of them, and loopback passes:** build on loopback with a port the
  system picks (option A). Pass the port to the page.
- **Speech recognition fails at both origins:** Listen needs a native `SFSpeechRecognizer` bridge in
  the real app.
- **The bridge rows pass:** the bridge can move from the WebSocket to the message handler with the
  same messages. The times show whether a cube's message rate fits.
