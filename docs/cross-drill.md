# Cross drill

The Cross tab of CFOP trains the cross. The owner asked for a way to drill it: scrambles made for
cross practice, and help to find and pick out the four cross edges faster. Built in 1.66.0.

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
learns to see the four edges alone. `cw:crossTrain`, off by default. It waits while a find runs, as
the find would be no test with the edges lit.

`drawMain` in `app.js` asks `crossTrainFade` for the stickers it draws (the turning cube too, and the
net), and `crossFindCls` for a class on each sticker while a find runs.

## Not built yet

- Find the edges by a smart cube: a tap on a face to name an edge.
- The finds by length in a table, and the gap from optimal of each cross solved on the cube.
