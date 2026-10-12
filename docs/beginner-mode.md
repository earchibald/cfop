# Beginner mode

A second method for the 3×3, next to CFOP: the Rubik's solution guide, layer
by layer in eight steps. The goal is learning, not speed. Wireframes and page
flows are on the design canvas: https://claude.ai/artifact/Dh15WcK6o3Q2HLCo2mwNJb

**Source.** The current guide, "You can do the Rubik's Cube, Solution Guide"
(Spin Master, V1-EU-M-2020, rubiks.com/solve-it). The owner's copy:
`~/Desktop/65afea09c4f7a02afbb9d876_Rubiks_SolutionGuide_3x3-Original.pdf`.
The method, the holds, the algorithms and the sayings are the guide's own.
An older Rubik's guide (triggers, yellow up throughout) was the base until
2026-10-11; it is gone.

## Status

Built on 2026-10-11 with every recommended option from the canvas.

| Part | State |
|---|---|
| Method data: steps, goals, cases, the named algorithms with their sayings | Done, `js/beginner.js` (`BEGINNER_STEPS`, `BEGINNER_ALGS`) |
| Solver that follows the guide, part by part, with holds | Done, `solveBeginner(cube)` in `js/beginner.js`, `test/beginner.js` |
| Algorithm boxes for the player (Moving Left in halves, the chant in three) | Done, `beginnerChunks(moves)` |
| Method chip and chooser, beginner rail, progress panel in the player | Done, `js/beginner-ui.js`, hooks in `js/app.js`, `test/method.js` |
| Learn: the step list, the lesson pages, the Cheat sheet | Done, `js/learn.js`, `test/learn.js` |
| Solve my cube: scan, paint or scramble, then one part at a time | Done, `js/guide.js`, `test/guide.js` |
| Paint-the-colors cube entry | Done, `js/paint.js`, `test/paint.js` |
| Practice one step, Progress, reset | Done, `js/practice.js`, `test/practice.js` |
| Glossary entries: daisy, white and yellow cross, Moving Left and Right, FUR, feed the fish, tail lights, the chant | Done, `js/glossary.js` |
| Beginner home: Up next, "What does your cube look like?", Mix it up with me, the player dress | Done 2026-10-11 (later), `js/beghome.js`, `test/home.js`. Mockups A, B and C on https://claude.ai/artifact/XKxia4KPAybq49UEcUQdZT; A was built |
| The method moved to the current guide: holds, algorithms, sayings, turn-overs | Done 2026-10-11. `js/beginner.js`, `test/beginner.js`; the guide, Learn, Practice and the glossary follow |
| Player keys, animation, the basics lesson as actions | Done 2026-10-11 (latest). Media-player keys and a per-method Keys card; a layer turns on the cube for each step, on by default here, off in CFOP, the Animate chip on the cube. Lesson 0: the three kinds of piece and the twelve letters are buttons that light the goal cube (`lnHighlight`, `lnShowTurn`, `turnRing` in `js/draw.js`); a small figure marks the front |

Still open: the Paint net on a phone has tiles of about 26px, smaller than a
44px touch target, because four faces sit side by side.

## The home, as built (approach A of the second canvas)

A beginner holds the cube white up, green in front, and the screen never
applies a hidden `z2`. The guide begins with the yellow center on top ("hold
your cube with the yellow center piece on the UP face"), so the first part of
the guided solve turns the cube over as its own instruction, a dashed `z2`
tile with the caption "turn over". The guide turns the cube over twice more:
white up for the white corners, yellow up again from the middle layer. Each
of those is the first dashed tile of that step's first part.

| Part | Built |
|---|---|
| Up next | A banner above the tabs on the Learn home: the step, one line about it, the eight squares, Continue (or Start) and Pick another step. |
| Your cube | "What does your cube look like right now?" with a white-up cube and two cards. Mixed up: Scan it with the camera, Paint the colors instead. Solved: Mix it up with me, Practice on the screen only. A link shows the scramble as letters, with the seed bar, for people who know the notation. The Solve my cube tab shows the same cards. |
| Mix it up with me | A fresh scramble, one turn at a time: a big tile, "Turn the right face" in words, a picture with the turning face bright and a curved arrow, Back, Next turn, Skip to the end, and a key line for the letter in use. Faces the normal view hides are shown from the left, from behind or from below, with a caption. The end says the cube is mixed up, still white up, and offers Start solving or Learn first. |
| The player dress | In beginner mode every tile carries a caption in words ("right ↻", "front ↺", "top ×2", "turn over"), a Key panel takes the place of the progress panel until closed, Auto-step reads "Show me", and a strip above the player names what is on the cube with Back to my cube. The player shows only when moves are loaded; the seed bar only in the letters view. |
| Views | `body[data-begview]`: `ask` (the question), `mix` (the walkthrough), `player` (moves loaded). The home shows on the Learn home and during a mix-up on any tab; a lesson hides it. |


## The method, as the guide gives it

| Step | Name | Hold | What the guide says |
|---|---|---|---|
| 0 | Get to know your cube | | Layers, faces, centers, edges, corners; the six letters, the mark, the 2. |
| 1 | The daisy | Yellow up | White edges to the top, white up. Top layer first, then middle, then bottom. Middle: white facing you at the front right, `R`; white facing right, `U'` then `F'`. Bottom: `F2`. Top layer with white facing out: hold it on the right, `R' U F'`. |
| 2 | The white cross | Yellow up | Turn the top until the front tile of the top edge matches the center, then `F2`. Then flip the cube over. |
| 3 | The white corners | White up | Corner in the bottom layer. Turn the bottom until it sits between its centers. White facing you: bottom left `D L D' L'`, bottom right `D' R' D R`. White facing down: corner at the bottom right, `F D' F' D2` first. White corner on top in the wrong place: top right, `R' D' R`. |
| 4 | The middle layer | Yellow up | Turn the top until a top edge makes a vertical line with the front center. Top tile matches the left center: Moving Left `U' L' U L U F U' F'`. Right: Moving Right `U R U' R' U' F' U F`. Stuck edge: hold it on the right, Moving Right. |
| 5 | The yellow cross | Yellow up | `F U R U' R' F'`, "FUR says U'R'F'". Dot any way, line left to right, L at the back left. |
| 6 | The yellow face | Yellow up | `R U R' U R U2 R'`. One corner: feed the fish, that corner at the front left. None: a yellow tile on the left face. Two: left thumb on a yellow tile on the front. |
| 7 | The yellow corners | Yellow up | Turn the top until two corners are right. Next to each other: tail lights at the back. `R' F R' B2 R F' R' B2 R2 U'`, the chant "run to me, fast, run to me, back back; run away, fast, run to me, back back; run run away, up". Across: once, then again. |
| 8 | The yellow edges | Yellow up | Solved side at the back. `F2 U L R' F2 L' R U F2`; both `U` as `U'` when the front edge matches the right center. |

The engine confirms every claim in that table (`test/beginner.js`): each
algorithm from the hold the guide gives, the two-correct-corners rule, and
300 random solves.

The solver reads the cube as held. The top center is "yellow" and the bottom
center is "white", whatever the real colors are. The app passes the scramble
after `z2`. Every part carries `up`, the center on top while it is done:
`'white'` for step 3, `'yellow'` otherwise. A consumer inserts `z2` where
`up` changes; `plan.moves` already has them. Output:

```js
{stages:[{n:3,id:'corners',name:'The white corners',parts:[
   {title:'White, red and green corner', text:'Turn the bottom until …',
    pre:"y'",            // one hold (y rotation) before the part, or ''
    moves:["D'","R'",'D','R'],  // face moves only
    chunks:[{label:'Corner in, right',id:'cornerRight',at:0,len:4}],
    up:'white',          // the center on top for this part
    alg:'cornerRight',   // the BEGINNER_ALGS entry, when the part is one
    piece:{type:'corner',colors:[0,1,2]}}]}, …],
 moves:[…], solved:true, end:Cube}
```

On 300 random scrambles a plan has 23 parts and about 140 moves, with two
turn-overs. Bottom and top turns stay literal: "turn the bottom: D" and an
algorithm that starts with `D'` are both shown, as the guide teaches them.

## Six decisions, as built (the recommended answer in every case)

| # | Question | Built |
|---|---|---|
| 1 | Where the method selector lives | A chip in the top bar, `3×3 · Beginner ▾`, opens a two-card popover. The first visit opens it once. |
| 2 | Beginner navigation | Five tabs: Learn, Solve my cube, Practice, Progress, Cheat sheet. The eight steps live inside Learn. |
| 3 | Guided solve | One part at a time: a big instruction, the moves with the guide's algorithm boxed and named, Done and Show me. A stage bar across the top. "Show the whole plan" opens the list. |
| 4 | How a real cube gets in | Three cards: Scan with the camera, Paint the colors, Scramble one for me. Scan first. |
| 5 | The player's third panel | Progress: the eight squares, cubes solved, up next, Solve my cube. "Time my solves" swaps in the timer. |
| 6 | Phone home | Learn is the home screen, under the Up next banner and the Your cube cards. The player shows only when moves are loaded. The top bar keeps the mark and the name. |
| 7 | Which Rubik's guide | The current one (2020, daisy, white corners white up with `D` moves, the sayings). Not the older trigger guide. Decided 2026-10-11. |

## Rules the beginner tabs keep from CFOP

- One current scramble, shared by every tab. A lesson's "Show on the cube"
  is a drill: the seed bar shows "Back to scramble".
- `setSequence` drives the player. Rotations show as dashed moves.
- Step status (unlearned, learning, finished) reuses `llState.status` with
  the ids `beg-0` to `beg-8`, and `stBtn` and `cycleStatus`.
- Times, history, scan and enter, the glossary and the theme are shared. The
  timer keeps the `solve` scope, so a beginner's times live with CFOP times.
- The chip remembers each method's last tab in `cw:method` and `cw:btab`.

## How the modules fit

`js/beginner-ui.js` owns the chip, `setMethod`, `heldCube()` (the scramble
after `z2`) and `begProgress`. `js/beginner.js` is pure data and the solver;
its `BEGINNER_ALGS` carry the guide's names, sayings and "why" lines, and
`beginnerChunks` boxes them inside any move list. Each tab module fills its own section at load
and talks to the rest through globals and `document` events (`cw:scramble`,
`cw:status`, `cw:tab`, `cw:method`): `openLesson(n)`, `startGuide()`,
`openPaint()`, `startPractice(n)`. A module that wants the player to show
its own state on tab entry registers `tabShow[tab]`.
