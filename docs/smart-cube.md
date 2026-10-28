# Smart cubes

| Item | Where |
|---|---|
| Protocol, cipher, Bluetooth link | `js/gan.js` (no DOM) |
| Smart cube dialog | `js/smart-ui.js`, opened by `#smartBtn` in the seed bar (3x3 only) |
| The Smart cube tab | `js/cubetab.js`: tab 7 of the CFOP rail, the live cube large in the main panel with every control beside it (turns, the tilt of the cube, the moves, the stage, Listen); `test/cubetab.js`. The voice: `js/smart-listen.js`; the reference card a case name opens: `js/smart-card.js` |
| Tests | `test/gan.js` (protocol), `test/smart-ui.js` (dialog), `test/fake-gan.js` (a fake GAN cube) |
| Saved MAC addresses | `cw:ganMac`, a map from the Bluetooth name to the address |
| The macOS app (Bluetooth bridge for Safari) | `mac/` (Swift, AppKit, Network, CoreBluetooth); `js/bridge.js` is the page side; `test/bridge.js` and `test/fake-bridge.js` |

## What it does now

Version 1.2.0 reads the state of a GAN smart cube and loads a scramble that gives
the same cube, through `scrambleFromCube`. The dialog keeps the link open. While
the dialog is open, the net follows each turn: a move message triggers a new
state request 150 ms later. "My cube is solved" sends the reset command. The
reset tells the cube that its current state is solved.

Version 1.14.0 adds the correction. The cube has no color sensors: it counts
its turns from the last reset and reports the count. A turn it missed, or one
made while it slept, leaves the count off, and no reconnect can mend it: the
count lives in the cube. Until now the one remedy was to solve the cube and
press My cube is solved. Now Scan my cube (the camera, `scan.js`) and Paint my
cube (`paint.js`) read the real state as the cube sits. The dialog closes for
the scanner or the painter, the link stays, and the cube that comes back goes
to `conn.correct(actual)` in `gan.js`: it reads the cube once more, and keeps
`fix = actual.mul(raw.inverse())`. Every state after that, in the dialog, the
cube tab and the lab, is `fix.mul(raw)`: the two move the same way under every
turn, so the fix stays right. The fix is kept by the cube's name in `cw:ganFix`
with the day it was made, goes to the link on connect, and a note under the
buttons names it. My cube is solved sends the reset command and drops the fix,
on the link and in storage: the cube counts from solved again. A cancelled scan
or paint brings the dialog back.

Version 1.16.0 shows the charge of the cube. The protocol has a battery
request and a battery message in every generation (`ganDecode` read them since
1.2.0, but nothing asked). `ganOpen` now sends the request 300 ms after the
notifications start, so the first state read goes first, and then once a
minute; the level, 0 to 100, stays on the link as `conn.battery` and goes out
as a `battery` event. The Smart cube dialog shows it by the cube's name, the
cube tab after the name and the head of its window the same way, and the lab
in its bar after the name, with a line in the log at each change. The glyph is
a small battery filled to the level with the percent after it
(`smartBatteryDraw`, `labBatteryDraw`); under 20% it turns the warn color and
its title says to charge the cube. It goes while the link is down.

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
is the move trail (`js/trail.js`, 1.42): the last ten in three zones, Now,
Recent and Earlier, each move with its number and the color of the face it
turned as held then; past ten, a range ("1–13") at the old end. Right to left
by default, Now on the left; Settings swaps it (`cw:trailDir`). Before 1.42 it
was ten plain tiles, oldest on the left, with a triangle after them for more. The tab asks for the state on every move, window or no window,
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
first reading sets the heading; Reset view and Keep this hold set it again.
Reset view sits beside Clear moves and shows while the tilt is live: hold the
cube as the moves read, then press, and the picture lines up with the hold.
The heading drifts over a long solve (the cube has no compass), and this is
the way back. Only the heading goes: a cube held with another face up brings
the band back.

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
what gravity says, not drift. Nothing lines the heading up on its own: 1.11.0
did so until the first layer turn, and a y turn of the cube before then showed
as the picture turned back the other way, which read as a reversed axis.
The moves and the stage never read from the tilt: the hold is the one
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

Version 1.33.0 adds the voice commands (`js/smart-listen.js`). A Listen
button sits with Clear moves and Hidden faces: a click listens until Stop, a
hold of the button listens once, as the Reference's Listen does, and a line
under the buttons says what was heard and what was done. Two commands. "Reset"
(or "reset cube") empties the list of moves, takes the heading again as Reset
view does when the tilt is live, and reads the stage again; the hold stays.
"Top yellow, bottom white" sets the hold: the top color names it, the bottom
must be the color under it ("White and red are not opposite faces" otherwise,
and nothing changes), and the front stays where it was when it can (from white
up, green in front, "top yellow" is z2: green stays in front), else the hold
the fewest turns away is taken; "front green" or "green toward me" in the
same breath sets the front. A hold said with moves on the list puts the
whole-cube turn on the list, as the buttons do, so the moves before it still
read right; an empty list takes none. With the tilt live, the heading is taken
again against the new hold; a cube that still sits another way brings the band.
The recognizer is a dictation model, so each color has the words it comes out
as ("wait", "read", "blew"), and a command must be the whole of what was
said, bar the small words around it: a color word inside talk is no command.
As in `listen.js`, a command acts on the final guess or on two early guesses in
a row, and only the new end of a long result is read. One microphone: the
Reference's Listen and this one stop each other. The listening ends with the
window and when the link drops. The lab has none of this yet.

Version 1.35.0 makes the smart cube a tab of its own: Smart cube, tab 7 of the
CFOP rail (`#tab-smart`), in place of the top-bar tab, its floating window and
the callout. Before a cube connects the tab is a Connect card; when one
connects in CFOP the page goes to the tab, so the live cube is there when the
dialog closes. The live panel puts the picture large on the left, with the band
and the turn buttons under it, and everything else beside it: the stage, the
moves, then Reset view, Clear moves, Front view, Hidden faces and Listen with its line, so
no control needs a scroll away from the cube. On the desktop the tab scrolls
its section under the top bar, as the Reference does. The rail button carries
the live dot (green; orange while the cube is held unlike the hold; gray while
the link is down, with Connect again in the panel). Leaving the tab stops the
turns and the listening; the moves and the stage count on. The picture draws
only while the tab is in view (`cubeTabShown`). While the tab listens, hints
under the line say what to say. A case name ("T perm", "Sune", "F2L 12") now
opens the reference card (`js/smart-card.js`): a small floating window beside
the cube with the group and the name, the picture with its views as chips (Top,
Side, 3D, Flat and Play, which loops the algorithm on the small cube) and Save
image, the algorithm covered and uncovered one move per second, Recognize, and
Details. The names go through the Reference's matcher; close calls come as
chips on the line, a click or the next sentence picks one, a weak name asks
while a card is open, and the stage on the cube breaks an OLL/PLL tie. In a
card: "reveal moves", "hide moves", "play", "stop", "close". The head drags the
card; the grip at its corner zooms it, the font size and the width together, so
everything inside scales (0.7 to 2.6, no wider than the screen); the place and
the zoom are kept in `cw:smartCard`. Esc closes the card; a modal takes Esc
first. `test/cubetab.js`, `test/smart-listen.js`, `test/smart-card.js`.

Version 1.39.0 makes the tab connect as the lab does (`smartAuto`,
`smartConnect` in `js/smart-ui.js`). Connect on the tab opens the chooser at
once: the browser's own, or the list over the bridge, on the Connect card. No
dialog comes between; the dialog is still behind Options and the Smart cube
button, for Scan, Paint, Use this cube and Disconnect. When the tab opens with
no cube, the page looks for one with no click. Over the bridge the list comes
up at once. A cube that connected before is taken as soon as it is heard: the
site and the lab share `cw:labCubes`, so a cube known to one connects by itself
in the other. With Web Bluetooth the look goes through `getDevices` and
`watchAdvertisements`, as in the lab; with no known cube the tab waits for a
press. Leaving the tab ends the look that the tab began. When the link drops,
the page looks for the cube again by itself, on any tab, and the reconnect does
not move the page. Disconnect by hand stops this. The look's row moves to the
dimmed panel while the link is down. Where the address is unknown, a press
opens the dialog to ask for it; a look with no click does not. In the macOS
app a look with no click waits while macOS has not asked for Bluetooth (the
card says to press Connect). `test/smart-auto.js`.

Version 1.37.0 adds the whole-cube turns by voice and puts the hold in terms
of the top and the front. "X", "x prime", "x counterclockwise", "back x" and
"x two", and the same for y and z, press the turn button under the picture
(`smartTurn`, then `cubeTabTurn`): the turn goes on the list, the hold moves on,
and a turn back takes both off, as the buttons do. The recognizer gives "why"
for y and "zee" for z, so each letter has its words (`SMART_AXIS_WORDS`). A
letter alone acts only on the final guess, because an early "x" may yet become
"x prime"; a turn with its word ("prime", "back", "two") acts on two early
guesses in a row. "Y perm" and "Z perm" stay case names: "perm" is no part of
a turn. The hold is now said as "top yellow, front green" (the hints, the
prompts, the phrase boosts); "bottom white" still parses, as the top's opposite.
The hints while the tab listens are four groups (Cube, Turn, Case, Card), each a
row of chips with one short line under it, and the long note under them goes
while it listens, so the hints fit beside the cube with no scroll. In one
column (960px and narrower) the picture gives way to 40vh while it listens, and
the groups sit two to a row where the width allows.

Version 1.40.0 adds Lock, the hold row and a key and a voice command for Clear moves.

| Part | What |
|---|---|
| Lock | A button before Reset view. It shows while the tilt is live. It is on by default and kept in `cw:smartLock`. Locked, the picture stays on the hold and the tilt is not used: no band, no orange dot, and Reset view is off. Unlocked, the picture follows the tilt as before, and Reset view lines it up. The readings still come while it is locked, so Lock off takes the heading from the cube as it sits then (`cubeTabKeep`). `cubeTabLive()` is true only while the picture follows the tilt. |
| Hold row | One row under the picture, above the turn buttons: Top with a tile for white and yellow, Front with a tile for green, orange, blue and red. The tiles of the hold are pressed. A tile sets the hold and turns the picture (`cubeTabSetHold`), and no turn goes on the list: the moves made so far keep their names. A top keeps the front where it can. A front keeps the top where it can, else white goes on top (`cubeTabHoldPick`, `cubeTabHoldNear`). The turn buttons stay for a turn in the middle of a solve, which the list must show. The voice hold ("top yellow, front green") still puts the turn on the list when the list has moves. |
| Clear moves | The C key on the tab, while the live panel is in view (`cubeTabKeys`, asked by the page's key handler before the timer's C). The button carries the badge. By voice: "clear moves", "clear", "clear the list", "empty the list". It empties the list alone; "reset" also reads the stage again and lines up the picture. |

Version 1.41.0 adds Front view.

| Part | What |
|---|---|
| Front view | A button between Clear moves and Hidden faces, and the V key on the tab (`cubeTabKeys`). Off (the default), the camera looks from above and to the right, with three faces in view. On, it looks at the cube straight on, larger, so a cube on the hold shows the front face alone (`CUBE_TAB_CAMS`, `cubeTabSetFront`). Kept in `cw:smartFront`. The lab's Isometric box is the same choice. |
| Hidden faces in Front view | Straight on, the faces turned away sit behind the cube or edge on, so the mirrors would show nothing. In Front view the picture draws them only while it follows the tilt (Lock off and a reading in, `cubeTabMirrors`); otherwise the Hidden faces button is off, and its tooltip says to turn Front view off. The site's `cw:hidden` setting does not change. |

## The lab

`lab/` is a page of its own for work on the smart cube, without the rest of the
site: `lab/index.html` loads `engine.js`, `draw.js`, `gan.js` and `bridge.js`,
the painter (`paint.js`, with `lab/helpers.js` for the few helpers of `app.js`
it expects, and its rules from `app.css` copied into the page) and nothing else
of the app, plus
`lab/smack.js` (pure), `js/f2l.js` (the F2L guide's solvers, pure) and `lab/lab.js` (the UI). `test/lab.js` covers them, with `test/f2l.js` for the F2L solvers.

| Part | What |
|---|---|
| Run it | `lab/run.sh` builds the macOS app if needed (ad hoc), starts it with `--root` on this checkout and `--no-open`, and opens `http://127.0.0.1:27272/lab/`. The bridge takes that origin, so Safari reaches a cube. A running app that serves the built-in pages or twistwright.com does not serve this checkout (`/bridge/info` says `"site"` is not `root`): `lab/run.sh --restart` quits it first. Chrome at the same address uses Web Bluetooth; `?bridge=1` takes the bridge instead, so the app reads the address. |
| Version | `LAB_VERSION` in `lab/version.js`, shown in the bar with the app's version when the bridge serves the page, and in the window title. Raise it with any change a user of the lab can see; the site's `APP_VERSION` stays as it is, since the lab is not part of the site. |
| Keyboard cube | The Cube select in the bar, after Connect: Smart cube, or one of four keyboard layouts (`LAB_KEYMAPS`, kept in `cw:labKeys`). Each layout puts six keys in a cross: the left, up, right and down keys around the front key, and the back key up and to the right of it. The layouts are A W D X with S front and E back, S E F C with D and R, J I L comma with K and O, and K O semicolon period with L and P. The key alone turns its face clockwise (the letter in lower case). Shift, or Caps Lock on a letter, turns it counterclockwise. Option (Alt) turns two layers, with or without Shift (`labKeyMove`). The keys are read by their place (`e.code`), so Option, which types another character on a Mac, does not change them. A held key does not repeat, and Command or Control with a key is no move. The faces are named as held. A two-layer turn is a face turn and a whole-cube turn (r is L x): the state keeps its centers home, as a smart cube reports it, and the hold moves on, as a turn the tilt finds moves it (`labKeyTurn`, `labWideParts`, `labUnlabel`). The picture turns the two layers in the old hold, then shows the new hold. With three turns still to show, a new key skips them. A layout stops the look for a cube and drops the link. Connect, or Smart cube in the select, goes back. The layout's keys come before the lab's own keys, and the bar hides the badges they take. My cube is solved reads Solved and puts the cube on the screen back to solved; Paint my cube sets it from the colors painted. Patterns and the F2L guide read it as they read a smart cube. |
| Connect | The lab opens as if Connect were pressed. Over the bridge the list comes up at once. A cube that once connected is remembered in `cw:labCubes` (by name: the address, the link's id, the time) and is taken as soon as the scan hears it, with no click; the status names the cubes the lab looks for. After the link drops (the cube went to sleep) the look starts again; Disconnect by hand does not. Connect during a look ends it and opens the chooser. With Web Bluetooth the chooser needs a click, so the look with no click goes through `navigator.bluetooth.getDevices` (the cubes this page was once allowed; Chrome has it behind a flag) and `watchAdvertisements`; where the browser has neither, the status asks for Connect. The address goes to `cw:ganMac` as well, the site's map. |
| The address | While a cube is connected, its MAC address sits in the bar after its name, with a copy button (two pages). The button puts the address on the clipboard, turns to a check for a moment and logs the copy. Where the browser gives the page no clipboard, it selects the address and uses the old copy command; where that fails too, the status asks the user to copy by hand. |
| The picture | Full page. The camera looks straight at the cube, so a level cube shows the face toward you alone until it tilts; the Isometric box in the bar (I, kept in `cw:labIso`) looks from a little to the right and above instead, the site's usual three-face view. A drag on the picture spins the view from there, as on the site's cube (`labViewDrag`, half a degree per pixel, pitch within 80 degrees of level); a double click, or the Isometric box, puts it back. Each turn of the cube turns its layer (`labPath`, the same search as `cubeTabPath`); the tilt turns the whole picture (`labGyro`). The moves since the connect sit in a box of their own under it, as the cube tab's readout: merged as they come, the last ten shown as the site's move trail (`js/trail.js`), and Clear moves. No stage. |
| The hold | "I hold it <color> up, <color> toward me" in the bar: the user's word on the pose, one of the 24 (`LAB_HOLDS`, as `CUBE_TAB_HOLDS`). The cube names its moves with its white face up and green in front, however it is held; the lab names them by the place each face sits in the hold (`labRelabel`), so with yellow up and green toward you the cube's R reads as L. A change of the hold puts the whole-cube turn from the old hold to the new on the list, dashed, so the moves before it still read right, and is a Reset cube at once. Kept in `cw:labHold`. |
| My cube is solved | The S key or the button. The cube counts its own turns and reports the count; it cannot see its stickers. A turn made while it slept, or one it missed, leaves the count off, and the picture shows a scramble the real cube does not have. The button sends the reset command (as the site's Smart cube dialog does), reads the state again and jumps the picture there with no moves added. The status after a connect says so when the cube does not read as solved. |
| Scan my cube | The button after My cube is solved, on while a cube is connected. It asks the cube for its state again, as the lab does at connect (`conn.readState`, `labRead`); the state event of that read shows nothing (`lab.reading`). A read that matches the picture changes nothing, and the status says so. Any other read is a state the lab never saw (a turn the cube did not report, or one made while the link was busy), so the moves between the two are not known as turns: the picture jumps there with no moves added. The read goes through the fix, as every state does. It is not the camera: the lab does not load `scan.js`. |
| Copy state | The button after Paint my cube, on once the lab has a state, connected or not. It writes the cube the picture heads for as 54 letters to the clipboard (`stateText` in `js/state-text.js`: W R G Y O B for the colors, face by face U R F D L B, a space between faces, in the cube's own frame, white up and green in front). The button says Copied for a moment and the log keeps the text. On the site, a paste of the letters anywhere on the page outside a field, or in the Enter a scramble dialog, loads that cube through `scrambleFromCube`, as a scanned cube does (`enterState` in `js/enter.js`). Where the browser does not let the page copy, the status says so and the letters go in the log to copy by hand. |
| Paint my cube | Opens the site's painter (`openPaint`) over the lab with Use this cube as the go button; the link stays. The cube that comes back is the real state: it goes to `conn.correct` (`gan.js`), which keeps `fix = actual · raw⁻¹` and applies it to every state after, and the picture jumps there with no moves added (a read for the correction shows nothing, `lab.reading`). The fix is saved by the cube's name in `cw:ganFix`, the site's map and shape (`labFixSave`), so a correction made here holds on the site, and one made in the site's Smart cube dialog holds here: the link loads it at connect and the log says so. My cube is solved drops it, here and in storage. Esc or Cancel closes the painter and the lab goes on as it was (`labPaint`). |
| Reset cube | The R key or the button. The cube as held now is the reference pose, the hold (`resetBasis` with the hold's turn). Yaw only by default, as Reset view in the app: the tilt stays what gravity says. Full reset (the checkbox) takes the whole reading, so a cube held at a slant shows square. The first tilt reading does the same on its own. |
| Experiment 2 | A turn of the whole cube, from the tilt. `turnDetector` in `lab/smack.js` cuts the readings into turns: the body past `start` degrees from its rest pose is a turn (a `tstart` event), a `tupdate` every `updateMs` while it moves, and a `tfinish` once the body has moved less than `settle` degrees for `still` ms, with the turn from the rest pose (its angle, its axis, and its name: the move letter for the axis with the most of it). The rest pose follows a still cube slowly, so a slow lean is no turn. The log carries every event with the numbers (`turn start`, `turn update`, `turn finish`). At the finish the lab finds the nearest of the 24 holds: within `snap` degrees of another hold, that whole-cube turn goes on the list, dashed, and the hold moves on (`labSetHold` from a turn: no Reset cube, since the picture already shows the cube as held); back at the hold, or between holds, nothing changes. Turn with the tilt, in the bar, switches it on (`cw:labTurn`, off by default: a cube kept green toward you is never re-held by a tip to look at a slot); the knobs in the panel set the numbers. |
| Patterns | The P key or the Patterns button opens a window of the two-look OLL and PLL cases the cube has shown, newest first, scrollable; Esc or P closes it. A drag of its head moves it; the place is kept in `cw:labPat` and clamped to the screen. Each state the cube reports is read as the CFOP stage of the cube as held (`cfopStage` in `js/stage.js`, so the lab loads `js/algs.js` and `js/stage.js`): a case in the OLL edges, OLL corners, PLL corners or PLL edges step goes in the list with the time, the step, its name and the moves that solve it as held (a whole-cube turn first where the cross is not down). The same case is listed once until another case comes or the cube is solved, so the U turns and the moves of the algorithm add nothing. The list is kept in `cw:labPatterns` (the last 200); Clear in the window empties it. New scramble in the window (N) makes no moves: it is the user's word that the cube in their hands is a fresh scramble. The matcher starts over (`lab.goal`), with the cross on the bottom as held as its first goal. An entry for the cube as it is holds that cross: its color, its shortest length, the count of its solutions of each length from the shortest up to seven moves, and up to three of the shortest, one per line, in letters as held. A case's moves and each shortest solution show their first move only; a cover hides each move after it, as the site's Reference does (`labSpoil`). A click on the line reveals the next move, Reveal the rest, and a click on an open line covers it again; what is open is kept for the session (`lab.patOpen`), so a new entry does not cover a line again. The moves the user made for the cross stay plain. When the cross is made, a Cross entry lists the moves it took (the first move after New scramble is not merged into the one before it; My cube is solved drops the goal, as the moves cannot be known). `crossSolutions` in `js/engine.js` counts the solutions: each solution once (commuting moves in one order, no face twice in a row, no U turn that leaves the cross as it was, and a sequence stops where the cross is solved). The cross table builds while the page is idle, so the first press answers at once. |
| F2L guide | The F key or the F2L guide button (beside Patterns) opens a window that guides the first two layers on the cube in the hands, one pair at a time; Esc or F closes it, and Esc closes the window in front first when Patterns is open too. It drags by its head as Patterns does (`labWinDrag`); its place is kept in `cw:labF2LWin`, and by default it sits right of Patterns, under the bar. It reads the cube as held (`labHeld`, then `reframe`), so the cross is the color on the bottom as held, the pairs are named by their place as held (front right, front left, back left, back right), and every hint reads as held. Until the cross is made, the window shows the cross line alone: "Make the yellow cross first. Shortest: 5 moves." with one shortest cross as a drill (`labHintLine`, as the step card's hint; kept as `lab.f2l.cross`, from `crossSolutions` once per hint, with the way back and New hint from here off a begun one). Then four chips in the order, each with the colors of its corner: a check when solved, the accent outline on the target, and a click on any other chip makes that pair the target now (`labF2LPick`). The target comes from the mode, Shortest (the open pair with the fewest moves from here; ties go to the order) or By corner (the first open pair of the order). Order shows a row of the four pairs with an arrow each way, kept in `cw:labF2LOrder` (front right, front left, back left, back right by default); the mode is kept in `cw:labF2LMode`. A change of the mode or the order counts now when the step has no move yet, else at the next step; a clicked target stays. The step card names the target and its colors and shows the hint as held as a drill (`labHintLine`), with its length: the first move in clear, every other move covered until the user makes it, in its place on the hint. No click uncovers a move and there is no Reveal (Patterns keeps both). Each move made along the hint turns plain and dim; a wrong move shows nothing more. A move off the hint asks for a new hint from the cube as it is after a 200 ms rest (`F2L_WAIT_MS`), for the same target; "Working." shows meanwhile. A solved pair that comes apart is said in the card, and it is open again. Look for combinations (kept in `cw:labF2LCombo`, off by default) adds, before the first move of a step, a hint that makes a second pair too, at most three moves longer (Also makes), and of the shortest hints the one that leaves the next pair shortest (Sets up), each with Use this; the parts run one per turn of the event loop with a node budget each, and a newer state cancels them. Then lists the pairs after the target with their move counts, from the cube after the hint. Solved pairs lists each step, newest first, with the moves the user made and the shortest at its start. New scramble and My cube is solved start the guide over; a new hold takes the pairs solved now as solved and starts the step over. The solvers are in `js/f2l.js` (pure; `test/f2l.js`): IDA* as `solveF2LPair`, with the same tables, on the pieces of the goal through small move tables, so it lists every shortest solution once (counted as `crossSolutions` counts the cross). The plan is in `docs/lab-f2l-guide.md`. |
| Experiment 4 | Fat moves, first in the panel. The cube reports r as L, since the middle layer carries the core and the core turns x (r = L x); the tilt sensor in the core sees that turn. `fatDetector` in `lab/smack.js` takes each move at the time of its move message (`lab.fatAts`, not the state that comes a round trip later), with the tilt readings about it, and `post` ms later says fat or not: the twist of the core about the named face's axis, from `pre` ms before to `post` ms after, against the face's own turn, past `min` degrees with swing under `swing`. With Read fat moves on (`cw:labFat`, on by default) the list, Patterns and the F2L guide wait for that word in order (`labFatDrain`): a fat move goes on the list as r, and the hold moves by the x inside it with nothing on the list (`labSetHold` from `'fat'`), so the next move reads as held. The picture does not wait. Each move is recorded with 800 ms of readings each side and the label the user gives (You do now: Anything, Fat turns, Face turns), kept in `cw:labFatData`; the panel draws the twist over time and a strip of every move against `min`, counts what the knobs judge right, and gives the best knobs (Use best knobs). Save data writes the records as JSON. The protocol and the open questions are in `docs/lab-fat-moves.md`. |
| Experiment 3 | Reset with twists. One face turned and turned back, three times over (R R' R R' R R', or U' U U' U U' U), is a gesture: `twistDetector` in `lab/smack.js` is fed each move as the cube reports it, before the list merges it (the six quarter turns undo each other, so the list is as it was). A move of another face, a half turn, or the same quarter turn twice starts the count over. The sixth turn is logged, and after the wait on the `after ms` knob (45 ms) the lab does Reset cube, as if R were pressed. The box in the panel, on by default, switches it off. |
| Experiment 1 | Three smacks on the right face bring a Reset dialog (Reset or Cancel, Enter or Esc). `smackDetector` in `lab/smack.js` takes each tilt reading in the frame of the picture, so its axes are the user's. A smack is a jolt from the rest pose past `jolt` degrees that comes back (under `settle`, or the cube still again with at least `back` of the peak undone) within `within` ms and under `maxDeg`; a jolt that stays is a turn of the cube in the hands, and the rest pose moves there. The rest pose follows a still cube slowly (`restTc`), so a slow lean makes no event. |
| The face | The cube reports its tilt, not a hit. A push on a face turns the body about an axis across that face (the torque is r × F, and F lies along the face's normal), so the face hit is the axis with the least of the jolt in it, when that share is under `perp`. The right and the left face lie across the same axis; the tilt alone cannot tell them apart, so the dialog says "right or left". |
| The panel | The count as three dots, the tilt away from rest, the speed, the readings per second, a trace of the last four seconds with the jolt line, sliders for every threshold, the face a series counts (or any), and a log of every smack, turn, reset and link event. L hides the panel, C (Clear all) clears the moves and the log. |

Not done yet: the gyro message also carries a 3-bit angular velocity per axis
(gan-web-bluetooth reads it at bit 68 for gen 2 and bit 80 for gen 4), which
`ganGyro` does not decode; it may make a sharper smack signal than the tilt
difference. The thresholds are untested on a real cube: tune them from the
log and the trace, then move what works into `cubetab.js`.

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
  (+x red, +y blue, +z white, right-handed) to the page's (x right, y up, z
  toward the viewer) as gan-cube-sample maps them: x, z, -y. The reading is the
  turn of the body. gan-cube-sample and cubing.js both apply it to the cube
  object as it is, and draw.js takes `rot` the same way, so the sign is not
  negated. The sign went back and forth on the real GAN 12 ui Maglev: 1.6.1
  negated it, 1.7.2 did not, 1.11.1 negated it again, and 1.12.0 does not.
  What read as a reversed axis in 1.11.0 was the heading lined up on its own
  part way through a y turn, not the sign. The check, with the picture
  following the tilt and after one layer turn: hold the cube white up, green
  toward you, and turn it y (the right face comes to the front): the picture's
  right face must come to the front. Tip the top toward you: the top of the
  picture must come toward you.
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

`mac/` holds Twistwright for macOS. From 1.47.0 it is a Dock app with a window of
its own: a `WKWebView` that shows the site at `twistwright://app/`, with the
Bluetooth bridge in the same process. The spike in `mac/spike/` tested that
origin first (secure context, storage across launches, module workers,
cubing.js, camera, microphone, speech: all passed on 2026-10-27). For one
release, the hand-off release, the app also keeps the menu bar item and serves
Safari as before, so a Safari user can move their history into the window. The
clean release removes the Safari path.

| Part | Where | What |
|---|---|---|
| Site | `mac/Sources/Site.swift` | `Site` gives the files of the site from one of two sources (see below): the built-in pages, or the live pages of `https://www.twistwright.com` through a proxy. `--root DIR` gives a checkout instead of both, for work on the site. Two front ends read it: `SchemeHandler` for the window at `twistwright://app/` (a folder without its slash gets a small page that goes to the folder with one), and `SiteServer` for Safari at `http://127.0.0.1:27272/`. `/bridge/info` answers `{app, version, ws, site, builtin}` there, which is how a Safari page knows the app is there; `site` is `builtin`, `live` or `root`, and `builtin` is the `APP_VERSION` of the built-in pages. |
| Bridge | `mac/Sources/Bridge.swift` | Carries JSON between a page and CoreBluetooth. The page keeps the GAN protocol and the cipher; the app moves bytes. A page is a `BridgeClient`: `PageClient` for a window, `SocketClient` for Safari over the WebSocket on `ws://127.0.0.1:27273/` (the handshake accepts only the `Origin` of the page the app serves). The scan runs while one page asks for it; a page that goes away drops its cubes. The messages are listed at the top of the file. |
| Page | `mac/Sources/Page.swift` | `PageWindow`: one window with one page. The page posts to `webkit.messageHandlers.bridge` (only pages at `twistwright://` reach it); the app answers `hello` and calls `window.bridgeEvent(m)` for each message back. A new page or a closed window drops the cubes of the page before, as a closed tab does. Other addresses open in the default browser; downloads go to a save panel; the camera and the microphone go to the page with no second prompt; Safari's Web Inspector reaches the page. |
| Setup | `mac/Sources/Setup.swift` | The Set Up Twistwright window: Bluetooth, Camera, Microphone and Speech Recognition, each with its state in macOS (Allow…, ✓ Allowed, or Turned off with Open System Settings), and History from Safari. It opens at launch while a row is still Allow… (the first launch, or a build with another signature, which macOS takes for a new app and so asks again), but not twice for the same rows (`setupOpenFor` in the app's defaults), and from Twistwright > Set Up Twistwright… or the menu bar item; `--setup` opens it and saves nothing. |
| App | `mac/Sources/App.swift` | The main menu (File: Bring History from Safari…, Open in Safari; View: reload, zoom, the two page sources; Window: Twistwright ⌘1, Smart Cube Lab ⌘2), the menu bar item (Open Twistwright, Open in Safari, Set Up Twistwright…, the Bluetooth state, the connected cube, Copy the Safari Address, Quit) and the `twistwright://` scheme. `twistwright://smart` opens the window with `?smart=1`, and the page opens the Smart cube dialog itself. |

The page in the window finds the app through `bridgeNative()` in `js/bridge.js`
before it looks for a server, so the rest of the page is the same in the window
and in Safari. The user agent ends in `Twistwright/<version>`.

### The history from Safari

Safari keeps the history of `http://127.0.0.1:27272/`; the window keeps its own,
at `twistwright://app`. File > Bring History from Safari… (or the row in the
setup window) opens `http://127.0.0.1:27272/?migrate=1` in Safari. That page
sends every `cw:` key over the WebSocket (`{op:"migrate",data,seq}`,
`bridgeMigrate`), the app asks the user, writes the keys into the window in
place of its own and reloads it, and answers `{ev:"migrated",seq,count}`. The
Safari page shows the result at the top (`smartMigrated`) and keeps its copy.

Any other way goes through the page itself, with no app: Settings > Your data
(`js/transfer.js`). Copy my data puts every `cw:` key on the clipboard as one
block of JSON (`{"twistwright":1,"version","saved","keys"}`); Paste my data in
another browser, or in the app's window, asks, replaces all its `cw:` keys and
loads the page again. So data moves from the app to Chrome, from Safari to
Chrome, or from Chrome to the app. A browser that does not let the page read
the clipboard gets a box to paste into. The first visit offers Paste my data
in the method chooser.

### The pages: built-in or live

From 0.2.0 the app carries a copy of the site. `mac/build.sh` takes the files
from a git commit (`index.html`, `css/`, `js/`, `assets/`, `lab/`), not from the
working tree, and puts them in `Contents/Resources/site/`. `site.json` beside
that folder names the ref, the commit and the site's `APP_VERSION`. The copy is
about 1.2 MB; the zip grows from 80 KB to about 530 KB.

| Source | Menu item | What the app serves |
|---|---|---|
| `builtin` (the default) | Built-in pages 1.40.1 | The copy in the app. It works with no internet connection and does not change until the next release of the app. |
| `live` | Live pages from twistwright.com | The proxy, with no cache of its own, as before 0.2.0. A reload shows a new deploy at once. With no answer from twistwright.com (10 s), each file comes from the built-in copy instead, so the app works offline. |

The choice is saved in the app's defaults (`site`). A reload of the page shows
the change. Both sources have the one origin, `http://127.0.0.1:27272`, so the
`cw:` history is the same in both. `--site builtin` or `--site live` sets the
source for one launch and does not save it. A build with `--no-site` has no
copy: the menu item for it is gray and the app serves the live pages. The
page needs no change for either source; Settings shows the `APP_VERSION` of
the pages in use.

The built-in pages still load the fonts from Google Fonts. With no connection
the page uses the system fonts.

CoreBluetooth starts on the first scan, so macOS asks for Bluetooth permission
when the user presses Connect (or Allow in the Set Up window), not when the app
opens. Until macOS has asked, the app gives the state as `notAsked`, and a scan
the page sends with `auto` (the look with no click, as when the window opens on
the Smart cube tab) starts nothing: before 1.47.3 that look brought up the
question at launch, ahead of the Set Up window. When the state leaves
`notAsked`, the page fires `cw:bridge` and the tab looks again.

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
mac/build.sh                   # Developer ID signed app in mac/build/, plus Twistwright-mac-X.Y.Z.zip
mac/build.sh --adhoc           # a build that stays on this Mac
mac/build.sh --notarize NAME   # also notarize with the notarytool keychain profile NAME, and staple
mac/build.sh --site REF        # build in the site at REF (tag, branch, commit); HEAD when not given
mac/build.sh --no-site         # build in no copy of the site: live pages only
mac/release.sh [--notarize NAME]   # tag HEAD mac-vX.Y.Z, build with the site at that tag
mac/build/Twistwright.app/Contents/MacOS/Twistwright --root . --no-open   # serve this checkout
mac/build/Twistwright.app/Contents/MacOS/Twistwright --port 27300 --no-open --site live   # a second app beside the first
```

`--port N` serves the page on `N` and the bridge on `N+1`, so a test build can
run while the installed app keeps 27272.

Releases live on GitHub Releases of this repo, tagged `mac-vX.Y.Z` after
`CFBundleShortVersionString` in `mac/Info.plist`. The zip carries the version in
its name, `Twistwright-mac-X.Y.Z.zip` (from 1.47.5; unzipped it is
`Twistwright.app`). The page asks the GitHub API for the latest release
(`macReleaseLoad` in `js/smart-ui.js`, kept an hour in `tw:macRelease`) and
links its zip with its version: "Download for macOS v1.47.5", in the download
dialog and in the footer on a Mac desktop. Until GitHub answers, or when it
cannot, the page offers the release named in `MAC_RELEASE`, a real file, so the
label and the zip agree. A new release is live as soon as it is published, and
GitHub releases are for the Mac app only. The site itself deploys from `main`.

The tag also chooses the built-in pages: the app carries the site as it is at
the tagged commit. To release:

1. Check out the commit of `main` whose site the app is to carry, and raise
   the version in `mac/Info.plist` if the last release used it.
2. Run `mac/release.sh --notarize twistwright`. It needs a clean tree. It
   makes the tag on this Mac, builds, and takes the tag back if the build fails.
3. Open `mac/build/Twistwright.app` and check Built-in pages in the menu.
4. Run the `git push` and `gh release create` lines that the script prints.

An app built with no tag (`mac/build.sh`) carries the site at HEAD, and
`site.json` says `HEAD` with the commit.

Releases are notarized, from 1.47.0 (its zip was notarized and stapled after
the release and uploaded again). The keychain profile `twistwright` holds the
credentials (`xcrun notarytool store-credentials twistwright`: Apple ID, team
LMMVWL22J9, an app-specific password). A downloaded notarized app opens after
one question from macOS, and the download dialog says only that. A release
built without `--notarize` is blocked at the first open ("Apple could not
verify") until the user presses Open Anyway in System Settings › Privacy &
Security, so always pass it.

### What is not there yet

- Reconnect when the app restarts while the page is open: the page drops the
  link and shows the download button; a reload finds the app again.
- A `localhost` history is not the `twistwright.com` history. `cw:` data is per
  origin.
- A release built by GitHub Actions on the push of a `mac-v*` tag. It needs the
  Developer ID certificate and the notarytool credentials as repository
  secrets. An ad hoc build from CI is worse than none: macOS calls a
  downloaded app with no Developer ID "damaged".
- A page that says the built-in pages are older than the live site. The page
  could compare `builtin` in `/bridge/info` with the `js/version.js` of
  twistwright.com and offer the switch.
- With Live pages and a connection that drops part way through a load, one
  page can mix live files and built-in files. A reload puts it right.
