# Beginner mode

A second method for the 3×3, next to CFOP: the Rubik's eight-step beginner
solve. The goal is learning, not speed. Wireframes and page flows are on the
design canvas: https://claude.ai/artifact/Dh15WcK6o3Q2HLCo2mwNJb

## Status

Built on 2026-10-11 with every recommended option from the canvas.

| Part | State |
|---|---|
| Method data: steps, goals, cases, triggers, named algorithms | Done, `js/beginner.js` (`BEGINNER_STEPS`, `BEGINNER_TRIGGERS`, `BEGINNER_ALGS`) |
| Solver that follows the guide, part by part, with holds | Done, `solveBeginner(cube)` in `js/beginner.js`, `test/beginner.js` |
| Trigger chunking for the player | Done, `beginnerChunks(moves)` |
| Method chip and chooser, beginner rail, progress panel in the player | Done, `js/beginner-ui.js`, hooks in `js/app.js`, `test/method.js` |
| Learn: the step list, the lesson pages, the Cheat sheet | Done, `js/learn.js`, `test/learn.js` |
| Solve my cube: scan, paint or scramble, then one part at a time | Done, `js/guide.js`, `test/guide.js` |
| Paint-the-colours cube entry | Done, `js/paint.js`, `test/paint.js` |
| Practice one step, Progress, reset | Done, `js/practice.js`, `test/practice.js` |
| Glossary entries: daisy, white and yellow cross, the triggers, Move Left and Right | Done, `js/glossary.js` |

Still open: the camera scanner reads the cube white up (its own instructions);
a beginner then sees the result yellow up in the player, which is right. The
Paint net on a phone has tiles of about 26px, smaller than a 44px touch
target, because four faces sit side by side.

## The method, as the guide gives it

| Step | Name | Mnemonic or algorithm |
|---|---|---|
| 0 | Get to know your cube | Centres never move. Yellow on top for every step. |
| 1 | The daisy | Four white edges around the yellow centre. Cases: L', R, F R, F' R, F2. |
| 2 | The white cross | Turn the top to match, then F2. |
| 3 | The white corners | Left Trigger `L' U' L`, Right Trigger `R U R'`. White up: Right Trigger twice. |
| 4 | The middle layer | Move Left `U' L' U' L`, Move Right `U R U R'`, then put the white corner back with a trigger. |
| 5 | The yellow cross | `F (R U R') U' F'`. Dot, then L at the back left, then line left to right. |
| 6 | The yellow face | `(R U R') U R U2 R'`. Count the yellow corners, hold as the guide says, repeat. |
| 7 | The yellow corners | `L' U R U' L U R'`, then the yellow face algorithm. Matching pair on the left. |
| 8 | The yellow edges | `F2 U L R' F2 L' R U F2`. Solved side at the back. Up to three times. |

The engine confirms every claim in that table (`test/beginner.js`). One
finding: in step 4 the guide's "put the corner back" half only works after
the cube turns, which the guide marks with a note that the front face
changes. The solver emits it as a second part with its own hold, which is
also how the guide draws it.

The solver reads the cube as held. The top centre is "yellow" and the bottom
centre is "white", whatever the real colours are. The app will pass the
scramble after `z2`, as the CFOP plan does for a white cross. Output:

```js
{stages:[{n:1,id:'daisy',name:'The daisy',parts:[
   {title:'White and green edge', text:'It is on the right of the front face …',
    pre:"y'",            // one hold (y rotation) before the part, or ''
    moves:['U','R'],     // face moves only
    chunks:[{label:'Right Trigger',id:'right',at:1,len:3}],  // for the player
    piece:{type:'edge',colors:[0,2]}}]}, …],
 moves:[…], solved:true, end:Cube}
```

On 300 random scrambles a plan has 29 parts and about 150 moves. Top turns
stay literal: "line it up" and the U of a Move are two moves, as the guide
teaches them, even when they cancel.

## Six decisions, as built (the recommended answer in every case)

| # | Question | Built |
|---|---|---|
| 1 | Where the method selector lives | A chip in the top bar, `3×3 · Beginner ▾`, opens a two-card popover. The first visit opens it once. |
| 2 | Beginner navigation | Five tabs: Learn, Solve my cube, Practice, Progress, Cheat sheet. The eight steps live inside Learn. |
| 3 | Guided solve | One part at a time: a big instruction, the moves with the trigger boxed, Done and Show me. A stage bar across the top. "Show the whole plan" opens the list. |
| 4 | How a real cube gets in | Three cards: Scan with the camera, Paint the colours, Scramble one for me. Scan first. |
| 5 | The player's third panel | Progress: the eight squares, cubes solved, up next, Solve my cube. "Time my solves" swaps in the timer. |
| 6 | Phone home | Learn is the home screen. Solve my cube is the one big button. The player shows only inside a lesson. |

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
after `z2`) and `begProgress`. Each tab module fills its own section at load
and talks to the rest through globals and `document` events (`cw:scramble`,
`cw:status`, `cw:tab`, `cw:method`): `openLesson(n)`, `startGuide()`,
`openPaint()`, `startPractice(n)`. A module that wants the player to show
its own state on tab entry registers `tabShow[tab]`.
