# Smart cubes

| Item | Where |
|---|---|
| Protocol, cipher, Bluetooth link | `js/gan.js` (no DOM) |
| Smart cube dialog | `js/smart-ui.js`, opened by `#smartBtn` in the seed bar (3x3 only) |
| The cube tab | `js/cubetab.js`: the tab in the top bar while a cube is connected, its floating window with the live cube (turns, the tilt of the cube, the moves), the first-time callout; `test/cubetab.js` |
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

Version 1.7.0 adds the moves under the picture. A move message carries no move,
so the moves come from `cubeTabPath`: the list between the last state and the
new one. Every move since the cube connected goes on `cubeTab.moves`, merged
as it comes (`cubeTabMerge`): the same face as the last move adds its turns,
so R then R is R2, and no turns left takes the move off, so R then R' is
nothing. A sequence turned back move by move empties the list. The readout
shows the last ten; past ten, a plain triangle after them says there are more
(no action yet). The tab asks for the state on every move, window or no window,
so the list stays complete. Five or more moves between two states cannot be
named, and the list keeps what it has. A new connection starts the list again.

Version 1.6.0 turned the picture with the cube's tilt, and version 1.9.0
took the hold (how the cube sits in the hands) from the same reading. Version
1.10.0 took both out: a hold that snapped to the nearest of the 24 ways to hold
a cube put turns on the list that the user had not made, and renamed the moves
after them. Version 1.11.0 brings the tilt back for the picture only, and
keeps the hold with the buttons: the picture shows the cube as it sits in the
hands, the moves and the stage read by the hold, and a band under the picture
says when the two differ. See "The tilt" below.

The hold. The cube names its faces its own way: its white face is U whatever
way it sits. Six buttons under the picture turn the whole cube: x, y, z and
their primes (`CUBE_TAB_TURNS`, `cubeTabTurn`). A press moves the hold on
(`cubeTab.hold`, one of `CUBE_TAB_HOLDS`: each as the shortest turns from
white up, green front, the cube after them, and the turn of the body as a
quaternion in the frame of draw.js; null is white up, green front), puts the
turn on the list (where y then y' takes both off, through `cubeTabMerge`), and
turns the picture, a little closer to the hold each frame (`quatSlerp`, most of
the way within a quarter of a second), so a press reads as a turn and not a
jump. `cubePolys` takes `rot`, a 3×3 matrix, for the turn of the body before
the camera; the camera stays the fixed one (yaw -32, pitch 28). A move the cube
reports is renamed by where its face sits in the hold (`cubeTabRelabel`): held
white down (z2), the cube's R is the user's L. The window's note says to press
the same turn when the cube turns in the hands; a user who does not press
reads the moves as the cube names them, and the stage then names the turn
that brings the cross down (z2, say) as its first move. A new connection and
Disconnect both put the hold back to white up, green front; a link that drops
keeps it, with the buttons disabled until the cube is back. Clear moves
empties the list.

The tilt. A gen 2 or gen 4 cube reports its tilt many times a second (a `gyro`
message, a unit quaternion, `ganGyro` in gan.js: the turn of the body, in the
frame of draw.js). `cubeTabGyro` takes each reading and turns the picture
toward it, a little closer each frame (most of the way within a tenth of a
second), so the picture follows the cube in the hands. With reduced motion the
picture goes straight to the reading, drawn once a frame at most. The cube
knows which way is up (gravity) but not which way the user faces, so a heading
(`cubeTab.basis`, a turn about the vertical) lines the reading up with the
hold: `cubeTabYawBasis(raw, holdQ)` finds the yaw that puts the cube's axes,
seen from above, where the hold puts them, from whichever of the three axes is
most level in both frames, so a lean in the reading stays in the picture. The
first reading sets the heading; Keep this hold sets it again.

The band. The hold the tilt sits in (`cubeTab.away`: the nearest of the 24,
`cubeTabSnap`, once the reading is more than `awayDeg` (55) from the hold, and
until it is within `backDeg` (40) again, so a cube turned part way does not
flicker) differs from the hold for `awayMs` (500), and a band under the
picture says how the cube sits and how the moves read: "Your cube sits with
yellow up, green in front. The moves and the stage read with white up, green
in front." The tab's dot turns orange meanwhile, window or no window. Read as
held presses the turns from the hold to the way the cube sits for the user
(`cubeTabHoldDelta`, `cubeTabMatch`): the hold moves on, the turns go on the
list, and the band goes. Keep this hold (`cubeTabKeep`) says the cube did not
turn: the heading is taken again so the reading lines up with the hold. It
shows only where the two holds have the same face up: a different face up is
what gravity says, not drift. Until the first layer turn after a connection
(`cubeTab.turned`), a heading away from the hold is lined up again on its own,
with no band: the user is picking the cube up, and the first heading was a
guess. The moves and the stage never read from the tilt: the hold is the one
source for them, the tilt the one source for the picture, and the band is the
one place the two meet. A gen 3 cube has no tilt; the buttons turn the picture
for it as in 1.10.0.

The stage. `cfopStage(held, prefer)` in `stage.js` takes the cube as held (the
reported state turned by the hold, `cubeTabHeld`) and finds where a CFOP
solve stands: Cross (with the count of edges of the preferred cross color,
the Cross color setting), F2L (the count of pairs), then the two-look case by
name from `ALG_DB` (Dot, L shape, Line; Sune, Anti-Sune, H, Pi, L, T, U; T perm,
Y perm; Ua, Ub, H, Z perm), AUF when only the last turn is left, and Solved.
The cross is looked for with each color down; the one furthest along wins, and
until a cross is complete only the preferred color counts. With the cross
already down, the hold is kept and the case gets a U turn before it where it
needs one; otherwise one turn of the whole cube (x, x', z, z', z2 or x2) comes
first in the moves, z2 for a cross on top so the front stays. The window reads
the stage only after the cube has been still for 1200 ms (`cubeTab.stillMs`);
a turn fades the panel but leaves it there. The moves show hidden (a dot
each), and every 1500 ms more without a turn (`cubeTab.revealMs`) one more
shows. Only a change of the cube counts as a turn (`cubeTabStir`, from
`cubeTabShow`): a cube can send its state again with no turn, and version
1.10.1 stopped a state that matches the picture from putting the reveals off,
which had kept every move a dot. A `move` message only asks for the state;
the state that answers shows the turn. A pause part way through the algorithm keeps the case on the screen,
with the moves done so far marked (`cfopStageDone` compares the cube as held,
centers and all, with the case's cube after each prefix of its moves, so a
turn of the whole cube counts only once the cube was turned). The same case
read again (after a U turn, say) keeps the moves already revealed; another
stage in between hides them again. The stage never falls back on its own
(`cubeTabBehind`, version 1.10.2): a reading further back in the solve than the
stage shown (`stageRank`) keeps the stage, with no move marked. A Sune breaks
the cross with its first move, and any other way through the algorithm, or a
slip put right, leaves no prefix for `cfopStageDone` to find; before 1.10.2 the
case gave way to Cross part way through. The stage is read anew once the cube
is at or past it again, or once more moves have gone by since it was read
(`cubeTab.since`) than its algorithm twice and four more, twelve at the least
(`cubeTab.keepMoves`): the user has moved on, to a new scramble say. A solved
cube is not kept (a turn of it is a scramble), nor the cross (nothing comes
before it). A turn of the whole cube with the cube still reads
the stage again at once. The panel keeps its height, so the picture does not
jump between stages.

The dialog reports the link as `cw:smart` events on `document`: `connect`
(with `conn` and the first `cube`), `disconnect`, `gone`, `close` (the dialog),
and each `move`, `state` and `gyro` message. The tab listens; nothing else
does yet.

The app does not decode the moves themselves yet: the tab infers a move from
two states. Next steps: decode the face and the direction from the move
message, a timer that starts on the first turn and stops on the solve, a
player that follows the cube, and hints for the cross and the pairs (the stage
names them but shows no moves).

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
  them: x, z, -y. The reading is the turn of the body, the cube's axes taken
  to the world's, and the sample uses it as it is. Version 1.6.1 negated the
  vector part to cure a picture that turned the wrong way; the cause was the
  first-reading frame of the time, not the sign, and once the up face came
  from the reading itself (1.7.1) the negation turned every axis the wrong
  way on a GAN 12 ui. Version 1.7.2 takes the reading as the sample does.
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
| Site | `mac/Sources/Site.swift` | Serves the page at `http://127.0.0.1:27272/`. The pages come from `https://www.twistwright.com` through a proxy with no cache of its own, so the app needs no new build when the site changes and a reload shows a new deploy at once. `--root DIR` serves a checkout instead, for work on the site. `/bridge/info` answers `{app, version, ws}`, which is how the page knows the app is there. |
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
