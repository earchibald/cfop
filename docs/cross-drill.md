# Cross drill

The Cross tab of CFOP trains the cross. The owner asked for a way to drill it: scrambles made for
cross practice, and help to find and pick out the four cross edges faster. Built in 1.66.0.

The Cross tab since 1.81: the first lesson on top while it is open (`js/start-app.js`; its Do it
part holds Check my plan), then What to look for, Check my plan and the Cross drill sheet.

## Length: scrambles made for the cross

The Cross drill sheet (it was Cross tuning) has a Length menu: any, easy (5 moves or fewer), hard (7
or more), or an exact length from 2 to 8 moves. Kept in `cw:crossDiff`.

Any, easy and hard pick from WCA scrambles until one fits, as before. An exact length cannot work
that way: in a random state a cross of 2 moves comes 1 time in 1,200, and one of 8 moves 1 time in
1,900. So an exact length makes its own state (`js/crossdrill.js`):

1. The four cross edges first. The cross table of `engine.js` (`buildCrossTable`, 190,080 places of
   the four edges) lists every place exactly n moves from solved. One is picked at random.
2. The other eight edges and the eight corners go anywhere, as in a WCA scramble, with the flips,
   twists and parity made right.
3. The cross is on the bottom in that frame. The cube as held for the cross color turns it back
   (`CROSS_DRILL_ROT`, the same turns as `CROSS_ROT` in `app.js`).
4. The two-phase solver finds the moves, as for every WCA scramble.

The seed names it all: `x6w-amber-otter-42` is a 6-move white cross. `wcaFor` in `js/wca.js` sends a
seed of that shape to `crossDrillState`, so the same seed always gives the same scramble, in the
history, Scramble Info and Restore scramble too.

## Find the edges

Under the cross plans: Find the edges, and a box to start it with each new scramble
(`cw:crossFindAuto`, off by default).

A clock starts. A click on a cross edge, either sticker, lifts it out of the cube with a glow. The
fourth stops the clock. A click on another piece is a miss, and the cube shakes. Drag the cube to see
its back; a drag picks nothing. A turn of the cube, or a step of the player, stops the find: the
state changed. The line under the button shows the count and the clock, then the time, the misses,
the mean of the last five and the best. `cw:crossFinds` keeps the last 100: `{ms, miss, n, t}`, with
`n` the length of the best cross.

## Cross Trainer

A button on the cube, on the Cross tab only (in the stage view, in the action bar). On, the cube in
view keeps the colors of the four cross edges and the centers. Every other piece is gray. It follows
whatever turns the cube: a virtual cube's keys, a smart cube's turns, the player's steps. So the eye
learns to see the four edges alone. `cw:crossTrain`, off by default.

How bright the other pieces show is a setting (1.67): Settings > Cross and F2L Trainer (Cross Trainer before 1.69), Other pieces, a
slider from 40% down to 0%, black. 22% by default, the level of 1.66. `cw:crossDim` keeps the
percent. The cube shows each move of the slider; Cancel puts the old level back. At 0% only the
cross edges and the centers have color: no cue from the other pieces. `drawMain` passes the level
as `dim` to `renderCube3D` and `renderNet`: a faded sticker goes over black at that opacity, so the
net and the hidden faces go black too, not the page color under them. While the pieces dim, the
plastic between the stickers is `--sticker-line-dim` (1.78.2): in dark mode a lighter gray than
`--sticker-line`, so the dimmed pieces read as a grid and not as one black block; in light mode the
same as `--sticker-line`. It waits while a find runs, as
the find would be no test with the edges lit.

`drawMain` in `app.js` asks `crossTrainFade` for the stickers it draws (the turning cube too, and the
net), and `crossFindCls` for a class on each sticker while a find runs.

## Overlay (1.77; named Virtual scramble until 1.80)

The owner asked for an overlay "virtual scramble" in Cross Trainer: the Cross twin of F2L Trainer's
Overlay (below). With a smart cube, a cross drill needed a scramble made by hand first (the fresh
start of 1.68). Now the screen makes it, and the cube in the hands turns it.

- The chip: **Overlay**, beside Cross Trainer while it is on (`#crossOverGrp`,
  `#crossOverBtn`, `js/crosstrain.js`), with the light of F2L's Overlay: on while it is on. The
  owner asked for it by that name in 1.80, so both tabs name the loop one way: a scramble on the
  screen, solve it with the light, the next one, until Overlay goes off. In the cube box it sits over the button, where F2L's style
  column sits; in the stage view's action bar, after the button. It is not kept over a reload.
- On: a new cross scramble of the Length picked loads (`crossNewScramble` in `app.js`, the job of
  New cross scramble), a scramble like any other, in the history too.
- A smart cube, while it is the cube: `M = S · P⁻¹` (`LIVE.map`, as F2L's Overlay), with S the
  scramble and P the cube in the hands. Each turn goes on the player and turns the screen's cube.
  The colors on the screen are not the cube's: look at the screen. Cross Trainer helps here, as
  only the cross edges show their colors.
- While it is on, a new scramble on the Cross tab is virtual too (`cxoScramble`, asked by
  `loadScramble`, sets the map for it). New Cross on a smart cube makes one, not a fresh start
  (`liveFresh`), so the Length menu works again.
- Off, or Cross Trainer off: the scramble from before, with your moves before and since, on every
  virtual scramble (`cxoOff`). Your cube took those turns, so a smart cube is in step again.
- Undo, Use my cube, or a new scramble on another tab ends it; that scramble stays. Its map is
  cleared only if it is still its own (`CXO.map`), so it never clears F2L Overlay's map.
- `test/crossoverlay.js`.

## Not built yet

- Find the edges by a smart cube: a tap on a face to name an edge.
- The finds by length in a table, and the gap from optimal of each cross solved on the cube.

## F2L Trainer (1.69)

The same idea on the F2L tab: a button on the cube, F2L Trainer (`#f2lTrainBtn`, `cw:f2lTrain`, off by
default). The eight F2L pieces keep their colors, with the centers: the four corners with the cross
color and the four edges with neither the cross color nor its opposite. Every other piece shows at
the Cross Trainer's level, `cw:crossDim`. It only changes what the cube shows; it sets nothing up.

### Three styles (1.70)

While F2L Trainer is on, three chips sit beside the button (`#f2lStyle`, `cw:f2lStyle`, F2L-3 by default):

- **F2L-1**: the cross and one pair. The pair is the one the F2L guide is on; off the guide, or before
  it picks one, the first pair in the guide's order (`cw:f2lOrder`) that is not solved. The slots are
  named as the solve holds the cube, cross color down (`f2lTrainPair`). When the guide moves to
  another pair, the cube draws again (`f2lTrainGuide`, called by `fgDraw`).
- **F2L-2**: the eight F2L pieces alone, with no cross (1.69's view).
- **F2L-3**: the first two layers: every piece with no sticker of the cross color's opposite, so the
  cross edges too. The default.

A click on a chip picks the style and turns the trainer on.

### The pair F2L-1 lights (1.72)

The owner asked for a choice of the pair: one pair named by its corner, or one the app picks by
shortest, fastest, or a chance to build the next pair while solving this one, which lights two.
While F2L-1 is pressed, more chips pick the pair (`#f2lPairRow`, `js/f2ltrain.js`; the owner
asked for options of F2L-1, not a second menu). On the cube box they are a column at the right,
level with the style column at the left, clear of the cube; in the stage view's action bar, a
row after the style chips. Kept in `cw:f2lPair`:

- **Guide**: 1.70's pair, the guide's (`f2lTrainPair`). The default.
- Picked from the cube (`js/f2lpick.js`, pure, `test/f2lpick.js`):
  - **Shortest**: the pair with the fewest moves from here, the cross and the solved pairs kept.
  - **Fastest**: the pair whose quickest solution to turn costs least, up to two moves longer than
    its shortest (`F2L_FAST_EXTRA`). The cost is per move (`F2L_SPEED`): U and R 1, L 1.25, F 1.6,
    D 2.2, B 2.5; a half turn 1.4 times its face. The search turns faces only, so no M comes out.
  - **Two at once**: two pairs. First, the two that one solution makes together, at most three
    moves longer than the shorter alone (`F2L_COMBO_EXTRA`, as the guide's Also makes); the
    fewest moves wins. Else the shortest pair and the pair one of its solutions sets up
    (`f2lSetup`, as Sets up). Else the shortest pair and the pair shortest after it. The last
    open pair shows alone.
- One pair: four chips, each a swatch of the pair's two colors, as the solve holds the cube:
  front right, front left, back left, back right (`f2ltPairs`). A 2 by 2 grid under the ways on
  the cube box; after a thin line in the action bar.

The pressed way shows a swatch of each pair it lights. Its tooltip says what is lit and why
("Lit: the green and red pair. It takes 7 moves.").

A pair is a key of its two side colors (`"1-2"`, red and green), not a slot, so a pick stays on
its pieces through every turn of the whole cube, and the stickers are found by color
(`f2ltPieces`). `f2lTrainFade` asks `f2lTrainPairs`, which asks `f2ltChoice`.

A pick is read from the cube in view, turned so the cross color is down (`f2ltFrame`). It is read
again once the cube changes and rests 150 ms, one search per turn of the event loop
(`f2ltSteps`), so the page does not stop (Two at once: about a quarter of a second, at worst
about two thirds). It holds while its pairs are not solved and are no farther from solved than
when it was picked (`f2ltStill`), so the light does not hop while the user works on a pair. A new
pick prefers the pairs of the one before on a tie; with Two at once, the second pair becomes the
first when the first is solved. A new scramble starts over. A pick needs the cross within three
moves (`F2LT_CROSS_NEAR`): an insert opens the cross for a move or two. Further off, F2L-1 shows
the guide's pair and the tooltip says to solve the cross first.

Known limit: each search has a budget of 4 million nodes (`F2L_PICK_NODES`). A rare joint search
of nine moves or more can run out in one hold and not in another, so Two at once can differ by
hold on such a cube.

### Overlay (1.73)

The owner asked for an Overlay button in F2L Trainer. It shows only the pair's corner and edge, with
the cross in place on the screen, so any scramble can be an F2L drill. Moves then turn the cross out
of place as they would. Off, the real cube shows again.

- The chip: **Overlay**, after the style chips while F2L Trainer is on (`#f2lOverGrp`,
  `#f2lOverBtn`). In the cube box it sits over the style column at the left; in the stage view's
  action bar, after the style chips. It is not kept over a reload: it records the cube at one
  moment. F2L Trainer off turns it off.
- The cube drawn (`f2ltOverlay`, pure, in `js/f2lpick.js`): the real cube A0 when the chip is
  pressed, with the cross put in place, the four F2L corners and the F2L edges where A0 has them,
  and the last-layer pieces made up and drawn gray (`f2ltGray`, color 6). The drawn cube O0 is a
  relabel of the pieces, `T = O0·A0⁻¹`. `drawMain` draws every cube A after it as `T·A`
  (`trainLook`), so a move of the real cube, on the keys, a smart cube or the player, moves the
  drawn cube the same way. The centers stay. With the cross already solved, T is no change.
- O0 keeps A0's edge parity and flip sum (it swaps or flips gray pieces), so `T·A` is a real
  cube, and the picks of F2L-1 (Shortest, Fastest, Two at once) read it as they read any cube
  (`f2ltCube`).
- An F2L edge in a cross place has no place on the drawn cube. It goes where the cross pushed a
  piece out, drawn gray and never at its home, and its pair is skipped: never lit, never picked
  (`skip`, `f2loFit`), and named in the chip's tooltip. On a random scramble that happens to about
  one pair in three.
- The style still says what is lit: F2L-1 the cross and the pair, F2L-2 the eight F2L pieces,
  F2L-3 the first two layers. A gray sticker is never lit.
- A new scramble or another cross color puts the cross in again. On another tab the real cube
  shows; back on F2L, the overlay again.
- The Patterns sheet, the F2L guide and Scramble Info still read the real cube.

### Overlay as a scramble (1.74)

The owner asked for one consistent cube: the overlay must be a full scramble to the "solve this"
state, every piece remapped, and the user looks at the screen cube, not the cube in the hands. The
lab's drill already worked this way (`quest/core.js` on `quest-cube-lab`: the picture is
`setup · P0⁻¹ · P`), so 1.74 does the same on the site. It replaces the 1.73 notes above where
they differ.

- On: the home cube as it is (the scramble, its grip turn and your moves, `homeNow` in `app.js`)
  goes through `f2ltOverlay` as before. O0 is a real cube, so `f2ltOverlayScramble` turns it to
  white up, green front (`f2ltHome`) and finds the moves that make it from solved: the first
  two-phase solution of 22 moves or fewer, as a WCA scramble takes. That loads as the scramble
  (`overlay-MMDD-hhmmss`, a custom scramble in the history). There is no gray and no `trainLook`:
  every part of the page (the player, the picture, F2L-1's picks, the F2L guide, Patterns,
  Scramble Info) reads this one cube, and every pair can be lit, the one whose edge was in a
  cross place too.
- A smart cube, while it is the cube: `M = setup · P0⁻¹` (`LIVE.map`, `liveMapSet` in
  `js/live.js`), with P0 the cube in the hands at the start. `cubeTabShow` takes each state as
  `M · state` (`liveMapIn`), so the page stays in step, each turn goes on the player and turns the
  screen's cube, and the sheet's stage reads the screen's cube. `liveReal` gives the cube in the
  hands back; Use my cube and New F2L mark that one.
- Off, or F2L Trainer off: the scramble from before, with your moves before and since
  (`homeAppend`). With a smart cube the map goes, and the page is in step with the cube in the
  hands again.
- While it is on, a new scramble on the F2L tab (New scramble, New F2L on a smart cube) gets the
  cross put in too (`f2loScramble`, asked first by `loadScramble`); another cross color puts that
  cross in. On another tab the overlay scramble is the cube, as any scramble is; a new scramble
  there ends Overlay, and so does Undo.

### One box, and a win between drills (1.78)

The owner found F2L-1 "stuck" on the orange and green pair, solved, with a smart cube and Overlay.
Two causes. A pair chip was pressed, and nothing on the screen said that the pair named was solved.
And with Shortest on a solved cube, the pick found no open pair and fell back to the guide's pair,
whose fallback was the first pair in the order, solved or not.

- **No solved pair lit.** With every pair solved, F2L-1 lights none (`f2lTrainPair` is null).
  Overlay on a cube with no pair to solve (a smart cube solved in your hands, or the F2L just
  solved) loads a fresh drill in its place: a random state with the cross put in (`f2loDone`,
  `f2loFresh`). The screen's cube is not the cube in your hands, so it can be any cube.
- **One box** (`#f2lTrainer`), so what is engaged reads at a glance. In the stage view it is a strip
  of its own under the action bar's buttons, each part with a small label; in the cube box each part
  keeps its place (`display:contents`).
  - **Show**: F2L-1, F2L-2, F2L-3. **Overlay**: a light, on while it is on.
  - **Pair**: the ways (Guide, Shortest, Fastest, Two at once), then the pairs you name. One chip
    is pressed across both, solid; the kind not in use dims (`data-idle`). With F2L-2 or F2L-3 the
    Pair part dims and its chip is outlined, not solid (`data-off`); a pick turns F2L-1 on.
  - **Lit** (`#f2lLit`): the pairs the cube shows in color now, a ✓ on a solved one, and a word
    (moves, solved, finding, every pair solved). It reads what the cube draws.
- **A win** (`js/trainwin.js`): your turn that solves what the trainer asks for (Cross Trainer: the
  cross; F2L-1: a pair it lit; F2L-2 and F2L-3: the F2L) lifts the pieces just solved a little, with
  a glow at half strength and a second, smaller hop (`TRAIN_WIN`, 750 ms). Then the next drill:
  F2L-1 lights its next pair; the F2L solved with Overlay on gives a fresh drill, and the cross with
  Overlay on the next cross on the screen, a smart cube too;
  else the tab's next scramble on the virtual cube. A smart cube with neither only glows: the
  page cannot mix the cube in your hands. A running timer waits for its stop.
