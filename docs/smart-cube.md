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

## The lab

`lab/` is a page of its own for work on the smart cube, without the rest of the
site: `lab/index.html` loads `engine.js`, `draw.js`, `gan.js` and `bridge.js`,
the painter (`paint.js`, with `lab/helpers.js` for the few helpers of `app.js`
it expects, and its rules from `app.css` copied into the page) and nothing else
of the app, plus
`lab/smack.js` (pure), `js/f2l.js` (the F2L guide's solvers, pure) and `lab/lab.js` (the UI). `test/lab.js` covers them, with `test/f2l.js` for the F2L solvers.

| Part | What |
|---|---|
| Run it | `lab/run.sh` builds the macOS app if needed (ad hoc), starts it with `--root` on this checkout and `--no-open`, and opens `http://127.0.0.1:27272/lab/`. The bridge takes that origin, so Safari reaches a cube. A running app that serves twistwright.com has no `/lab/`: `lab/run.sh --restart` quits it first. Chrome at the same address uses Web Bluetooth; `?bridge=1` takes the bridge instead, so the app reads the address. |
| Version | `LAB_VERSION` in `lab/version.js`, shown in the bar with the app's version when the bridge serves the page, and in the window title. Raise it with any change a user of the lab can see; the site's `APP_VERSION` stays as it is, since the lab is not part of the site. |
| Connect | The lab opens as if Connect were pressed. Over the bridge the list comes up at once. A cube that once connected is remembered in `cw:labCubes` (by name: the address, the link's id, the time) and is taken as soon as the scan hears it, with no click; the status names the cubes the lab looks for. After the link drops (the cube went to sleep) the look starts again; Disconnect by hand does not. Connect during a look ends it and opens the chooser. With Web Bluetooth the chooser needs a click, so the look with no click goes through `navigator.bluetooth.getDevices` (the cubes this page was once allowed; Chrome has it behind a flag) and `watchAdvertisements`; where the browser has neither, the status asks for Connect. The address goes to `cw:ganMac` as well, the site's map. |
| The address | While a cube is connected, its MAC address sits in the bar after its name, with a copy button (two pages). The button puts the address on the clipboard, turns to a check for a moment and logs the copy. Where the browser gives the page no clipboard, it selects the address and uses the old copy command; where that fails too, the status asks the user to copy by hand. |
| The picture | Full page. The camera looks straight at the cube, so a level cube shows the face toward you alone until it tilts; the Isometric box in the bar (I, kept in `cw:labIso`) looks from a little to the right and above instead, the site's usual three-face view. A drag on the picture spins the view from there, as on the site's cube (`labViewDrag`, half a degree per pixel, pitch within 80 degrees of level); a double click, or the Isometric box, puts it back. Each turn of the cube turns its layer (`labPath`, the same search as `cubeTabPath`); the tilt turns the whole picture (`labGyro`). The moves since the connect sit in a box of their own under it, as the cube tab's readout: merged as they come, the last ten shown, the newest outlined in the accent color, a triangle with the count for more, and Clear moves. No stage. |
| The hold | "I hold it <color> up, <color> toward me" in the bar: the user's word on the pose, one of the 24 (`LAB_HOLDS`, as `CUBE_TAB_HOLDS`). The cube names its moves with its white face up and green in front, however it is held; the lab names them by the place each face sits in the hold (`labRelabel`), so with yellow up and green toward you the cube's R reads as L. A change of the hold puts the whole-cube turn from the old hold to the new on the list, dashed, so the moves before it still read right, and is a Reset cube at once. Kept in `cw:labHold`. |
| My cube is solved | The S key or the button. The cube counts its own turns and reports the count; it cannot see its stickers. A turn made while it slept, or one it missed, leaves the count off, and the picture shows a scramble the real cube does not have. The button sends the reset command (as the site's Smart cube dialog does), reads the state again and jumps the picture there with no moves added. The status after a connect says so when the cube does not read as solved. |
| Scan my cube | The button after My cube is solved, on while a cube is connected. It asks the cube for its state again, as the lab does at connect (`conn.readState`, `labRead`); the state event of that read shows nothing (`lab.reading`). A read that matches the picture changes nothing, and the status says so. Any other read is a state the lab never saw (a turn the cube did not report, or one made while the link was busy), so the moves between the two are not known as turns: the picture jumps there with no moves added. The read goes through the fix, as every state does. It is not the camera: the lab does not load `scan.js`. |
| Copy state | The button after Paint my cube, on once the lab has a state, connected or not. It writes the cube the picture heads for as 54 letters to the clipboard (`stateText` in `js/state-text.js`: W R G Y O B for the colors, face by face U R F D L B, a space between faces, in the cube's own frame, white up and green in front). The button says Copied for a moment and the log keeps the text. On the site, a paste of the letters anywhere on the page outside a field, or in the Enter a scramble dialog, loads that cube through `scrambleFromCube`, as a scanned cube does (`enterState` in `js/enter.js`). Where the browser does not let the page copy, the status says so and the letters go in the log to copy by hand. |
| Paint my cube | Opens the site's painter (`openPaint`) over the lab with Use this cube as the go button; the link stays. The cube that comes back is the real state: it goes to `conn.correct` (`gan.js`), which keeps `fix = actual · raw⁻¹` and applies it to every state after, and the picture jumps there with no moves added (a read for the correction shows nothing, `lab.reading`). The fix is saved by the cube's name in `cw:ganFix`, the site's map and shape (`labFixSave`), so a correction made here holds on the site, and one made in the site's Smart cube dialog holds here: the link loads it at connect and the log says so. My cube is solved drops it, here and in storage. Esc or Cancel closes the painter and the lab goes on as it was (`labPaint`). |
| Reset cube | The R key or the button. The cube as held now is the reference pose, the hold (`resetBasis` with the hold's turn). Yaw only by default, as Reset view in the app: the tilt stays what gravity says. Full reset (the checkbox) takes the whole reading, so a cube held at a slant shows square. The first tilt reading does the same on its own. |
| Experiment 2 | A turn of the whole cube, from the tilt. `turnDetector` in `lab/smack.js` cuts the readings into turns: the body past `start` degrees from its rest pose is a turn (a `tstart` event), a `tupdate` every `updateMs` while it moves, and a `tfinish` once the body has moved less than `settle` degrees for `still` ms, with the turn from the rest pose (its angle, its axis, and its name: the move letter for the axis with the most of it). The rest pose follows a still cube slowly, so a slow lean is no turn. The log carries every event with the numbers (`turn start`, `turn update`, `turn finish`). At the finish the lab finds the nearest of the 24 holds: within `snap` degrees of another hold, that whole-cube turn goes on the list, dashed, and the hold moves on (`labSetHold` from a turn: no Reset cube, since the picture already shows the cube as held); back at the hold, or between holds, nothing changes. Turn with the tilt, in the bar, switches it on (`cw:labTurn`, off by default: a cube kept green toward you is never re-held by a tip to look at a slot); the knobs in the panel set the numbers. |
| Patterns | The P key or the Patterns button opens a window of the two-look OLL and PLL cases the cube has shown, newest first, scrollable; Esc or P closes it. A drag of its head moves it; the place is kept in `cw:labPat` and clamped to the screen. Each state the cube reports is read as the CFOP stage of the cube as held (`cfopStage` in `js/stage.js`, so the lab loads `js/algs.js` and `js/stage.js`): a case in the OLL edges, OLL corners, PLL corners or PLL edges step goes in the list with the time, the step, its name and the moves that solve it as held (a whole-cube turn first where the cross is not down). The same case is listed once until another case comes or the cube is solved, so the U turns and the moves of the algorithm add nothing. The list is kept in `cw:labPatterns` (the last 200); Clear in the window empties it. New scramble in the window (N) makes no moves: it is the user's word that the cube in their hands is a fresh scramble. The matcher starts over (`lab.goal`), with the cross on the bottom as held as its first goal. An entry for the cube as it is holds that cross: its color, its shortest length, the count of its solutions of each length from the shortest up to seven moves, and up to three of the shortest, one per line, in letters as held. A case's moves and each shortest solution show their first move only; a cover hides each move after it, as the site's Reference does (`labSpoil`). A click on the line reveals the next move, Reveal the rest, and a click on an open line covers it again; what is open is kept for the session (`lab.patOpen`), so a new entry does not cover a line again. The moves the user made for the cross stay plain. When the cross is made, a Cross entry lists the moves it took (the first move after New scramble is not merged into the one before it; My cube is solved drops the goal, as the moves cannot be known). `crossSolutions` in `js/engine.js` counts the solutions: each solution once (commuting moves in one order, no face twice in a row, no U turn that leaves the cross as it was, and a sequence stops where the cross is solved). The cross table builds while the page is idle, so the first press answers at once. |
| F2L guide | The F key or the F2L guide button (beside Patterns) opens a window that guides the first two layers on the cube in the hands, one pair at a time; Esc or F closes it, and Esc closes the window in front first when Patterns is open too. It drags by its head as Patterns does (`labWinDrag`); its place is kept in `cw:labF2LWin`, and by default it sits right of Patterns, under the bar. It reads the cube as held (`labHeld`, then `reframe`), so the cross is the color on the bottom as held, the pairs are named by their place as held (front right, front left, back left, back right), and every hint reads as held. Until the cross is made, the window shows the cross line alone: "Make the yellow cross first. Shortest: 5 moves." with one shortest cross as a drill (`labHintLine`, as the step card's hint; kept as `lab.f2l.cross`, from `crossSolutions` once per hint, with the way back and New hint from here off a begun one). Then four chips in the order, each with the colors of its corner: a check when solved, the accent outline on the target, and a click on any other chip makes that pair the target now (`labF2LPick`). The target comes from the mode, Shortest (the open pair with the fewest moves from here; ties go to the order) or By corner (the first open pair of the order). Order shows a row of the four pairs with an arrow each way, kept in `cw:labF2LOrder` (front right, front left, back left, back right by default); the mode is kept in `cw:labF2LMode`. A change of the mode or the order counts now when the step has no move yet, else at the next step; a clicked target stays. The step card names the target and its colors and shows the hint as held as a drill (`labHintLine`), with its length: the first move in clear, every other move covered until the user makes it, in its place on the hint. No click uncovers a move and there is no Reveal (Patterns keeps both). Each move made along the hint turns plain and dim; a wrong move shows nothing more. A move off the hint asks for a new hint from the cube as it is after a 200 ms rest (`F2L_WAIT_MS`), for the same target; "Working." shows meanwhile. A solved pair that comes apart is said in the card, and it is open again. Look for combinations (kept in `cw:labF2LCombo`, off by default) adds, before the first move of a step, a hint that makes a second pair too, at most three moves longer (Also makes), and of the shortest hints the one that leaves the next pair shortest (Sets up), each with Use this; the parts run one per turn of the event loop with a node budget each, and a newer state cancels them. Then lists the pairs after the target with their move counts, from the cube after the hint. Solved pairs lists each step, newest first, with the moves the user made and the shortest at its start. New scramble and My cube is solved start the guide over; a new hold takes the pairs solved now as solved and starts the step over. The solvers are in `js/f2l.js` (pure; `test/f2l.js`): IDA* as `solveF2LPair`, with the same tables, on the pieces of the goal through small move tables, so it lists every shortest solution once (counted as `crossSolutions` counts the cross). The plan is in `docs/lab-f2l-guide.md`. |
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
