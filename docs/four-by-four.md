# The 4×4

Two methods for the 4×4, next to the 3×3 and 2×2 ones. The chip in the
top bar chooses a puzzle and a method: `4×4 · Beginner` and `4×4 · Advanced`.

| Section | Source | Built |
|---|---|---|
| Beginner | A reduction guide (2020): centers, edges, then the 3×3 beginner steps | 2026-10-11, `js/master.js`, the beginner tabs through a pack |
| Advanced | Reduction with CFOP, the two parity fixes most 4×4 solvers learn first, and Yau described as the next step | 2026-10-11, `js/speed4.js`, `js/speed4-ui.js` |

## The model

A 4×4 has no fixed centers, so the 3×3 cubie model does not fit. `js/four.js` keeps the 96
stickers as an array, index `16*face + 4*row + column` in the drawing code's order, and finds
every move's permutation from geometry: each sticker has a position, a move turns the stickers
of its layers a quarter turn about the face's axis, and each one lands where another was. Any
notation the guide uses parses: `R` the outside face, `r` the inside slice, `Rr` both as one,
`R'r'` and `Rr'` the same turn; `Rw` and `2R` are read too. `FourCube` wraps a state so
`applyAlg`, `toFacelets` and the player treat it like a `Cube`; the drawing code takes `n: 4`.

Once the centers are solid and the edges paired, `fourToCube` reads the cube as a 3×3 `Cube`
in the hold of the moment (it turns the picture to standard centers, reads it, and turns the
`Cube` back). The 3×3 solver and planners then work on that image, and their outside turns
apply to the 4×4 unchanged. A parity state reads as an "unsolvable" 3×3, which is exactly what
it is; the two parity fixes are 4×4 moves applied before the 3×3 step that would fail.

Scrambles are 40 moves of the outside faces and the three wide turns `Uu`, `Rr`, `Ff`. A painted
cube has no scramble behind it: `loadState` makes the state itself the mix-up.

## The beginner method, as the guide gives it

| Step | Name | What the guide says |
|---|---|---|
| 0 | Get to know your cube | 24 center tiles, 24 edge pieces, 8 corners; the color layout (white opposite yellow, red opposite orange, blue opposite green; when white is up, red is left of blue); face turns, slice turns, two letters for both. |
| 1 | Solve the centers | White first, a white tile on top. Another white tile not on top: on a side, hold it in front and turn the front until it is at the lower right of the center; on the bottom, turn the bottom until it is at the lower right. Turn the top until a non-white tile is at the upper left. Front: `Rr U R'r'`. Bottom: `Rr2 U Rr2`. Then yellow, red, green, orange, blue, keeping the layout: when yellow is up, green is to the right of red. |
| 2 | Pair the edges | Two pieces of the same colors to the left and right of the front with outside turns. Not across: `R F' U F` lines them up. Across: `Dd R F' U R' F D'd'`, "Don't Run Fast Unless Running Fast Daily". |
| 3–10 | Like a 3×3 | The eight steps of the 3×3 beginner guide (`js/beginner.js`), outside turns only. Yellow cross with 1 or 3 edges up: parity, `r2 B2 U2 l U2 r' U2 r U2 F2 r F2 l' B2 r2`. Yellow edges with two correct: across, hold them left and right, `r2 U2 r2 Uu2 r2 u2`, "Are you? Are you you? Are you?"; next to each other, hold them left and back, the parity, then the 3×3 algorithm. |

The engine confirms the guide (`test/four.js`, `test/master.js`): the center insert swaps the
front's lower-right tile with the top's upper-left one; the pairing algorithm exchanges the
front's lower-left and upper-right wings, so two pieces pair when they sit in the same row with
the same color facing you; the yellow-cross parity flips the front edge pair alone; the
yellow-edges parity swaps the front and back pairs. 40 random cubes held any way round solve in
about 49 parts and 314 moves, with both parities exercised.

The solver (`solveMaster`) builds the centers in the guide's order, deriving each color's face
from the color layout and the centers already built, so the last four land where the corners
say. Edges: a search over outside turns brings the two pieces across from each other, then the
algorithm; the last two edges may take the algorithm twice. The 3×3 part runs `solveBeginner`
in groups of steps round the parity checks (`opts.stages`). Every turn of the whole cube is a
part's own `pre`, so `up` never changes and the guided solve never inserts a hidden flip.

## The advanced section

| Tab | What it does |
|---|---|
| Solve | Plan: centers and edges as the guide, a hold (standard colors, then white down), cross, four pairs, two-look OLL and PLL from outside-turn algorithms (`FOUR_LL`), OLL parity after F2L when the top edge count is odd, PLL parity after OLL when corner and edge parity disagree. Each step clickable; the whole plan loads into the player. |
| Parity | Three cases, OLL parity, PLL parity and its adjacent form, with status and per-case times. Next case sets one on the cube with a random top turn; Reveal shows the algorithm and why it works. |
| Reference | The three methods in a line each (the guide, reduction with CFOP, Yau's six steps), notation, the parity algorithms, the guide's algorithms. |

Yau is described, not planned: its last-four-centers and three-two-three edge pairing need
constrained searches that are not built. The plan generator is reduction with CFOP.

## Decisions

| # | Question | Built |
|---|---|---|
| 1 | The model | Stickers and geometric permutations, so any slice and any notation work and nothing has to be hand-tabulated. |
| 2 | The 3×3 stage | Reuse the 3×3 solver on an image of the reduced cube, with the parity fixes as 4×4 moves between stage groups. |
| 3 | Where each center goes | From the color layout and the centers already built, through the engine's 24 rotations. The guide's words ("when yellow is up, green is to the right of red") name the rule. |
| 4 | Holds | Always a part's `pre`, never an `up` change: the solver turns the cube many ways and the player shows each turn as a dashed tile. |
| 5 | A painted 4×4 | No scramble is derived; the state is loaded as the mix-up. History does not reload it. |
| 6 | Scanner and Lab | 3×3 only. |

Open: Yau as a plan; center building in bars; a 4×4 optimal or near-optimal solver.
