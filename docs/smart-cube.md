# Smart cubes

| Item | Where |
|---|---|
| Protocol, cipher, Bluetooth link | `js/gan.js` (no DOM) |
| Smart cube dialog | `js/smart-ui.js`, opened by `#smartBtn` in the seed bar (3x3 only) |
| The cube tab | `js/cubetab.js`: the tab in the top bar while a cube is connected, its floating window with the live cube (turns, and the tilt of the cube), the first-time callout; `test/cubetab.js` |
| Tests | `test/gan.js` (protocol), `test/smart-ui.js` (dialog), `test/fake-gan.js` (a fake GAN cube) |
| Saved MAC addresses | `cw:ganMac`, a map from the Bluetooth name to the address |
| The macOS app (Bluetooth bridge for Safari) | `mac/` (Swift, AppKit, Network, CoreBluetooth); `js/bridge.js` is the page side; `test/bridge.js` and `test/fake-bridge.js` |

## What it does now

Version 1.2.0 reads the state of a GAN smart cube and loads a scramble that gives
the same cube, through `scrambleFromCube`. The dialog keeps the link open. While
the dialog is open, the net follows each turn: a move message triggers a new
state request 150 ms later. "My cube is solved" sends the reset command. The
reset tells the cube that its current state is solved.

Version 1.4.0 adds the cube tab. While a cube is connected, the top bar carries
a tab with the cube's name (`GAN12uiM_A1B2` reads "GAN 12 ui Maglev"). The tab
opens a floating window with a live cube. Each move message asks the cube for
its state, one request at a time. `cubeTabPath` finds the shortest list of up
to four moves from the last picture to the new state (two moves out meet two
moves back, under a millisecond). The window queues those turns and turns each
layer in order; a state that lands during a turn joins the queue, and turns
speed up as the queue grows (`cubeTabDur`), so the picture catches up within a
turn or two. Five or more moves apart, it shows the new state at once. The
head of the window drags it; the place is kept in `cw:cubeWin` and clamped to
the screen. Close (Esc) collapses the window into the tab. Disconnect removes
the tab.
A link that drops by itself dims the tab, and the window offers Connect again.
The first time a cube connects, the page dims around the tab for eight seconds
and a callout points to it. The dialog is a modal, so the callout waits until
the dialog closes. `cw:cubeTip` records that it was shown.

Version 1.6.0 turns the picture with the cube. A gen 2 or gen 4 cube reports its
tilt many times a second (a `gyro` message, a unit quaternion). The first
reading sets the frame: the cube is taken to be white up, green front at that
moment, because the cube's own frame is not known. The picture then turns with
the cube, a little closer to the reported tilt each frame (`quatSlerp`, most of
the way within a tenth of a second), so a quick turn reads as a turn. The window
carries two controls once the tilt arrives: Follow my cube (on by default, kept
in `cw:cubeFollow`; off is the fixed view) and Reset view (hold the cube white
up, green front, press, and the picture lines up). The gen 3 cube (i Carry 2)
has no gyro, so its window shows no controls. `cubePolys` takes `rot`, a 3×3
matrix, for the turn of the body before the camera; the body turned +90° about
y is the picture of the move y'. The held view uses a camera a little from the
right and above (yaw -24, pitch 18), so three faces show when the cube is held
straight.

The dialog reports the link as `cw:smart` events on `document`: `connect`
(with `conn` and the first `cube`), `disconnect`, `gone`, `close` (the dialog),
and each `move`, `state` and `gyro` message. The tab listens; nothing else does yet.

The app does not decode the moves themselves yet: the tab infers a move from
two states. Next steps: decode the face and the direction from the move
message, a timer that starts on the first turn and stops on the solve, and a
player that follows the cube.

## The GAN protocol

The facts come from gan-web-bluetooth (Andy Fedotov, MIT) and csTimer.

| Gen | Cubes | Service |
|---|---|---|
| 2 | GAN12 ui, GAN12 ui FreePlay, GAN Mini ui FreePlay, GAN356 i Carry, i Carry S, i 3, MoYu AI 2023 | `6e400001-b5a3-f393-e0a9-e50e24dc4179` |
| 3 | GAN356 i Carry 2 | `8653000a-43e6-47b7-9cb0-5fc21d4ae340` |
| 4 | GAN12 ui Maglev, GAN14 ui FreePlay | `00000010-0000-fff7-fff6-fff5fff4fff0` |

`ganOpen` picks the protocol by the service that the cube offers. A user does not
need to know which GAN 12 ui they have.

- **Cipher.** AES-128-CBC with a fixed key and IV. The six bytes of the MAC
  address, in reverse order, are added to the first six bytes of each, mod 255
  (not 256). Each message encrypts its first 16 bytes, then its last 16 bytes.
  Decryption goes in the reverse order. `js/gan.js` has its own AES, because
  `crypto.subtle` cannot decrypt one block without padding.
- **State.** The cube sends 7 corner positions (3 bits), 7 corner twists (2 bits),
  11 edge positions (4 bits) and 11 edge flips (1 bit). The last of each follows
  from the others. The order is Kociemba's, the same as `js/engine.js`, so the
  fields make a `Cube` as they are. The frame is the cube's own: white up, green
  front.
- **Tilt.** A gen 2 cube sends event 0x01 with four 16-bit words from bit 4: w,
  x, y, z, each a sign bit and a 15-bit size over 0x7FFF. A gen 4 cube sends
  event 0xEC with the same words from bit 16. Gen 3 has none. The cube's axes go
  to the page's (x right, y up, z toward the viewer) as gan-cube-sample maps
  them: x, z, -y. This mapping and the frame of the first reading are from the
  sample, not from a cube in hand; if a real cube turns the wrong way, this is
  the line to change (`ganGyro`).
- **A wrong key.** A wrong MAC address decrypts to noise. Noise almost never
  gives two valid permutations, so `ganDecode` returns `bad`. The cube also
  cannot read a request under a wrong key, so it often stays silent. `readState`
  then rejects with `timeout`, or with `badmac` when the cube sent messages and
  none decoded.

## The MAC address

Web Bluetooth does not give the MAC address. The cube puts it at the end of its
manufacturer data, under a company code of the form `0xNN01`. Only
`watchAdvertisements()` reads that data. In Chrome on a computer it needs
`chrome://flags/#enable-experimental-web-platform-features`. Some advertisements
carry no manufacturer data, so `ganWatchMac` skips them and waits for one that does.
Where the browser cannot read it, the dialog asks the user to type it. A typed
address that works is saved by the cube's name.

Over the bridge (below) the app reads the address from the advertisement and
the page gets it with the cube in the chooser list, so nobody types it on a Mac.

## Browsers

Web Bluetooth works in Chrome and Edge on a computer and on Android. Safari and
Firefox do not have it. On iOS, the Bluefy browser has it. It needs a secure
page: GitHub Pages or `localhost`.

Safari blocks a WebSocket to `localhost` from an `https://` page, with no
exemption for loopback (tested in Safari 27.2). Chrome and Edge allow it. So a
bridge for Safari cannot sit beside `twistwright.com`: the app has to serve the
page itself, from an `http://127.0.0.1` origin, which is a secure context and
has no mixed content.

## The macOS app

`mac/` holds Twistwright for macOS, a menu bar app with no window of its own.
It does three things:

| Part | Where | What |
|---|---|---|
| Site | `mac/Sources/Site.swift` | Serves the page at `http://127.0.0.1:27272/`. The pages come from `https://www.twistwright.com` through a proxy, so the app needs no new build when the site changes. `--root DIR` serves a checkout instead, for work on the site. `/bridge/info` answers `{app, version, ws}`, which is how the page knows the app is there. |
| Bridge | `mac/Sources/Bridge.swift` | A WebSocket on `ws://127.0.0.1:27273/` that carries JSON between the page and CoreBluetooth. The page keeps the GAN protocol and the cipher; the app moves bytes. The handshake accepts only the `Origin` of the page the app serves. The messages are listed at the top of the file. |
| App | `mac/Sources/App.swift` | The menu bar item (Open Twistwright, the Bluetooth state, the connected cube, Copy the address, Quit) and the `twistwright://` scheme. `twistwright://smart` opens the page with `?smart=1`, and the page opens the Smart cube dialog itself. |

CoreBluetooth starts on the first scan, so macOS asks for Bluetooth permission
when the user presses Connect, not when the app opens.

### The page side

`js/bridge.js` probes `/bridge/info` when the page is at a loopback address,
opens the WebSocket and sets `BRIDGE`. `bridgeDevice(link, {id, name, mac})`
wraps a cube in the shape of a Web Bluetooth device (the parts `ganOpen`
uses), so the GAN code is the same on both paths. `ganAvailable()` is true with
Web Bluetooth or a bridge. `smartMode()` in `smart-ui.js` names the path:

| Mode | When | The button in the seed bar |
|---|---|---|
| `bt` | `navigator.bluetooth` exists (Chrome, Edge, Bluefy) | Smart cube; the browser's chooser |
| `bridge` | the app serves the page and answered | Smart cube; the chooser is a list in the dialog, with the address from the app |
| `download` | a Mac with neither (Safari at twistwright.com) | "Download macOS app to use a Smart Cube", marked `.dl`; the download dialog with the release and a `twistwright://smart` link |
| `none` | anything else | Smart cube; the dialog says which browsers work |

### Build and release

```sh
mac/build.sh                   # Developer ID signed app in mac/build/, plus Twistwright-mac.zip
mac/build.sh --adhoc           # a build that stays on this Mac
mac/build.sh --notarize NAME   # also notarize with the notarytool keychain profile NAME, and staple
mac/build/Twistwright.app/Contents/MacOS/Twistwright --root . --no-open   # serve this checkout
```

Releases live on GitHub Releases of this repo, tagged `mac-vX.Y.Z` after
`CFBundleShortVersionString` in `mac/Info.plist`. The page links
`releases/latest/download/Twistwright-mac.zip`, so a new release is live as soon
as it is published, and GitHub releases are for the Mac app only. The site
itself deploys from `main`.

Until a release is notarized, macOS blocks the first open ("Apple could not
verify") and the user has to press Open Anyway in System Settings › Privacy &
Security. The download dialog says so. To notarize, store credentials once:
`xcrun notarytool store-credentials twistwright` (Apple ID, team LMMVWL22J9, an
app-specific password), then build with `--notarize twistwright`.

### What is not there yet

- An app icon. The bundle uses the system icon.
- Reconnect when the app restarts while the page is open: the page drops the
  link and shows the download button; a reload finds the app again.
- A `localhost` history is not the `twistwright.com` history. `cw:` data is per
  origin.
