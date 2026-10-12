# The 2×2

Two methods for the 2×2 (the Rubik's Mini), next to the two 3×3 methods. The chip in the
top bar chooses a puzzle and a method: `2×2 · Beginner` and `2×2 · Speed`.

| Section | Source | Built |
|---|---|---|
| Beginner | "You can do the Rubik's Mini, Solution Guide" (Spin Master, V1-EU-M-2020). The owner's copy: `~/Desktop/65afebcae0a3534d92a9b921_Rubiks_SolutionGuide_2x2-Mini.pdf` | 2026-10-11, `js/mini.js`, the beginner tabs through a pack |
| Speed | Ortega (face, OLL, PBL) and CLL, with the algorithms jperm.net lists for the 2×2 (`/lib/2x2oll.js`, `2x2pbl.js`, `2x2cll.js`, read 2026-10-11) | 2026-10-11, `js/speed2.js`, `js/speed-ui.js` |

## The model

A 2×2 is the corners of the 3×3 model (`js/two.js`). Edges and centers are ignored. A state is
solved when the four corner stickers of every face match (`twoSolved`); there are no centers to
match. The 24 stickers a 2×2 shows are the corner stickers of the 3×3 (`twoFacelets`), and the
drawing code takes either form: `setDrawN(2)` makes every picture a 2×2.

Scrambles use R, U and F only, as the WCA does. Those moves keep the bottom-back-left corner in
place, so the solver works in that frame: `twoAlign` turns the cube so that corner is home, and
the search uses nine moves on 7!·3^6 = 3,674,160 states. One table holds the distance of every
state (`buildTwoTable`, about a quarter of a second); `twoOptimal` reads an optimal solution from
it. `twoSearch` finds the shortest moves to a goal on the stickers: a face, a layer, an oriented
top. A painted cube becomes a scramble of face moves through `twoScrambleFor`.

Each puzzle keeps its own scramble. The chip swaps them (`swapPuzzleScramble`). The seed bar
offers 9, 11 or 13 moves for the 2×2.

## The beginner method, as the guide gives it

The guide starts white up and never names centers: the first corner defines the hold.

| Step | Name | Hold | What the guide says |
|---|---|---|---|
| 0 | Get to know your Mini | | Two layers, six faces, eight corners; the six letters, the mark, the 2. |
| 1 | The first two corners | White-red-blue corner at the top front right: white up, red in front, blue right | The second corner (white-blue-orange) goes next to it. In the top layer: hold it on the right, `R' D' R`, then hold the first corner on the left. Twist the bottom until it is at the bottom right of the front. White facing you `R`; facing right `R' D' R`; facing down `D R2`. |
| 2 | The third corner | The second corner on the left | White-green-orange. Back right with white facing back: `R'`. Back right any other way: `R D'`. Front right but twisted: `R2 D'`. Then the three bottom cases. |
| 3 | The fourth corner | The third corner on the left | White-green-red. Front right twisted: `R' D' R`. Bottom: white facing down `F D' F' D2` first; facing you `D' R' D R` (Corner in); facing right `R' D' R`. |
| 4 | Make the yellow face | White down | `R U R' U R U2 R'`, "Up, Over, Down, Over, Up, Over over, Down". One yellow on top: Top one, at the front left. None: None left, a yellow tile on the left face at the front. Two: I see two, my left thumb is on you, a yellow tile on the front at the left. |
| 5 | Place the yellow corners | Yellow up | Twist the top until two corners match the bottom layer. Next to each other: hold them at the back. `R' F R' B2 R F' R' B2 R2 U'` with the chant. Across: once, then again. |

The engine confirms every claim (`test/mini.js`): each algorithm from the hold the guide gives,
the three yellow-face holds finish every twist state within three rounds, the chant swaps the two
front corners on top (so the matched pair goes at the back, as on the 3×3), and 300 random cubes
held any way round. A plan has about 8 parts and 46 moves.

`solveMini(cube)` returns the same plan shape as `solveBeginner`: stages of parts, each with a
hold `pre`, `moves`, `chunks` and `up` ('white' for the top layer, 'yellow' after). A `pre` is a
string of one or two whole-cube turns: the first hold can be any turn; later holds turn about the
vertical. The beginner modules parse it with `parseAlg`.

## Beginner packs

`js/beginner-ui.js` holds two packs, `BEG_PACKS.beginner` and `BEG_PACKS.mini`, and `begPack()`
picks the current one. A pack gives the beginner modules the steps, the algorithms, the solver,
the chunk finder, the step count, the status prefix (`beg-`, `mini-`), the progress store
(`cw:begProg`, `cw:miniProg`), how the cube is held (`held`, `heldMoves`, `startUp`), the frame
and goal cubes of the lessons, the face thumbs, the cheat sheet rules, and the words that differ
(the "next method" button, the hold text, the basics blurb). The home, Learn, Solve my cube,
Practice, Progress and Cheat sheet read the pack and re-render on `cw:method`.

## The speed section

| Tab | What it does |
|---|---|
| Solve | Plan: the Ortega plan (a face of white or of the shortest color, the turn that puts it on the bottom, OLL, PBL) and the CLL plan (a layer, one algorithm) side by side, each step clickable, each plan loadable. Optimal: one solution from the table. |
| Ortega | 7 OLL and 5 PBL cases: status, selection, Next case with a random top turn (an OLL drill gets a random PBL under it), Reveal with the answer for the state on the cube, per-case times. |
| CLL | The 42 cases by OLL shape, the same trainer. |
| Reference | The three methods and EG in a line each, every case as a card, notation. |

Case pictures (`twoThumb`) are a top view with the side stickers round it; PBL shows the bottom
view beside it, seen from below with the front at the top. OLL grays every sticker that is not
the top color. `test/speed2.js` checks every algorithm and that the 42 CLL cases cover the 648
top-layer states exactly once; the probability weights match the state counts.

## Decisions

| # | Question | Built |
|---|---|---|
| 1 | Where the puzzle lives | In the method chip: two groups of two cards. `method` is `beginner`, `cfop`, `mini` or `speed2`; `METHODS` maps each to a puzzle, a kind (`beg` or `speed`), a rail and a tab key. `body[data-kind]` drives the beginner CSS, `body[data-puzzle]` the puzzle-only text. |
| 2 | One scramble or one per puzzle | One per puzzle, swapped by the chip. |
| 3 | The 2×2 frame | No centers, so the user's hold is the frame: the picture shows the top face on top. The guide's first instruction is a hold. A painted cube keeps its stickers; the scramble behind it is face moves. |
| 4 | Scanner | Reads the 2×2 too (`scan:true` in the pack). A 2×2 has no centers, so the six faces are placed by their corner pieces once all are read; about one state in fourteen fits more than one cube, and the dialog then offers Next fit. See `docs/scanner-handoff.md`. |
| 5 | The Lab | 3×3 only; 2×2 case windows have no Lab button. |

Open: EG-1 and EG-2 (86 more cases) are described in the Reference but not trained. The CLL
recognition text is per group; the picture tells the cases apart.
