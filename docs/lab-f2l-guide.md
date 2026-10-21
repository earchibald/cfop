# The F2L guide in the smart cube lab

A window in the lab (`lab/`) that guides the first two layers on the real cube,
one pair at a time, with hints: the first move shown, the rest covered until
the user asks. Three ways in, and the user can change the way at any step.

| Item | Where |
|---|---|
| The solver and the steps (pure, no DOM) | `lab/f2l.js` |
| The window and the live follow | `lab/lab.js` (`labF2L*`), markup and CSS in `lab/index.html` |
| Tests | `test/lab-f2l.js` (pure, every mode on random scrambles), and a section in `test/lab.js` (the window over the fake bridge) |
| Storage | `cw:labF2LOrder` (the by-corner order), `cw:labF2LMode`, `cw:labF2LCombo`, `cw:labF2LWin` (the window's place). The list of solved pairs is not kept: it belongs to one solve, and New scramble empties it |
| Version | `LAB_VERSION` 0.18.0 |
| Docs | A row in the lab table of `docs/smart-cube.md` |

## What the user sees

The bar gets a button, F2L guide (key F), beside Patterns. It opens a floating
window built as the Patterns window is (`.patwin`: a head that drags, a body
that scrolls, Esc closes). The window reads the cube as held, as Patterns does:
the hold from the bar (`labHeld`), the cross color as the color on the bottom
as held (`held.center[3]`), the moves in letters as held.

The window, top to bottom:

1. **The cross line.** "White cross on the bottom: made." Or, before the cross:
   "Make the white cross first. Shortest: 5 moves." with one shortest solution
   as a covered line (`labSpoil`). It uses `crossSolutions(reframe(held), n)`
   with `n` the shortest length from the cross table, so each state costs
   little. Nothing below it shows until the cross is made. Most hints take a
   cross edge out and put it back; while the user is on a hint, the line says
   "The hint takes the white cross apart for a few moves. It makes the cross
   again before it ends." and the
   rest stays.
2. **The four slots as chips, in the current order.** Each chip names the
   slot as held and the colors of its corner: "Front right · green orange
   white", with three small swatches. A chip is one of: solved (a check and a
   dashed border), target (the accent outline), or waiting. A click on a waiting chip makes it the target now. The order
   stays as it was: the guide comes back to the order after this slot.
3. **The mode switch.** "Target" Shortest | By corner, a two-button group
   with `aria-pressed`. Shortest: the target is the
   unsolved slot with the fewest moves from here (greedy, one slot at a time,
   as `solveF2L` with no order). By corner: the next unsolved slot in the order.
   The switch takes effect at the next step, or now if the user has not begun
   the current step (no moves since the step started). A press of Shortest
   while a target is set by a click keeps that target.
4. **Order.** A row under the switch, shown by an Order button: the four
   slot names with a left and a right arrow each. Plain buttons, no drag. Kept
   in `cw:labF2LOrder`. Default: front right, front left, back left, back right
   (the site's first fixed order, `FR,FL,BL,BR`). The names are positions as
   held, so the order is a position order, not a piece order.
5. **The step card.** "Target: front right (green, orange, white)." Under it
   the hint: the moves as held, first move shown, the rest covered. A click
   reveals the next, Reveal the rest, a click on an open line covers it again.
   The count: "7 moves", then "7 moves, 2 made" as the user goes, and
   "· a combination" when the hint came from Use this. As the user turns the
   cube, the moves done so far, if they follow the hint, show as plain and dim
   before the first covered move, so the hint walks with the user. A move that
   is part of a revealed run keeps the rest of the run revealed. A half turn
   made as two quarter turns stays on the hint (`f2lPart`). A move off the
   hint that is on another shortest solution, or on the hint with two moves on
   opposite faces made in the other order, goes on with that list from where
   the cube is (`f2lAlong`): the hint reads in the order made and nothing is
   asked for anew. A move off every one of them recomputes the hint from the
   cube as it is; the target stays. The hint does not change under the user:
   while the cube is on it the step stays, with what the user has revealed,
   whatever else happens (a mode or order change, a move made and unmade). A
   step the user has not begun re-picks on a mode or order change.
6. **Combinations** (a box, Look for combinations, kept in `cw:labF2LCombo`,
   off by default). Under the step card, for the target:
   - **Also makes**: a solution that solves the target and one other slot
     together, when it is at most `F2L_COMBO_EXTRA` (3) moves longer than the
     target alone. One line per other slot found: "Also makes back left:
     9 moves" with the covered moves and a Use this button that puts it in the
     step card as the hint.
   - **Sets up**: among the shortest solutions for the target alone, the one
     after which the next slot (the one the mode would pick next) is shortest.
     "Sets up front left: then it takes 4 moves. After the plain hint, the
     next pair takes 7 moves." with the covered moves and Use this. Shown only when
     it beats the plain hint by at least one move. The plain number is the
     next step after the plain hint, whichever pair the mode takes there.
   These are steps, not one long list: the card shows one target at a time.
   The box shows only before the first move of a step, since its lines start
   from the cube at the step's start. The line in use says "In use"; "Use
   the plain hint" goes back. While the parts run: "Looking for
   combinations." With none: "No combinations in 3 more moves or fewer." A
   part that ran out of nodes adds "The search stopped early. These are some
   of them." 
7. **Then.** Under the card: the slots still to do in the order the mode
   would take them, each with its move count from the cube after the current
   hint: "Then front left, 7 moves · back left, 5 · back right, 4". Names and
   counts only, no moves. The moves of a slot show only when it is the target.
   Each count follows the hint the window would show for that slot, so a
   slot solved by chance on the way drops out.
8. **Solved pairs.** A list of the steps solved, newest first, as the Cross
   entry in Patterns: "Front right: 8 moves (shortest was 7)". The moves the
   user made, plain. A step that solved a second pair names both: "Front
   right and back left: 9 moves". (The plan called it Done; the UI says
   "solved", the project's word.)

The window is live. Each state the cube reports goes to the guide
(`labF2LRead(cube)`, called from `labShow` after `labPatRead`), and the window
redraws. A step is done when the target slot is solved with the cross and the
done slots kept. A done slot that comes apart is said in the step card ("The
front left pair came out.") and the guide recomputes: that slot is unsolved
again, the target stays unless the target is now solved.

The solvers take up to a few hundred milliseconds in the worst case. Recompute
after a short wait (`F2L_WAIT_MS`, 200) from the last state, so a fast sequence
of turns computes once. While it computes, the step card says "Working." The
combinations compute after the plain hint, each in its own `setTimeout`, so
the page stays live; a new state cancels what is pending (a sequence number).

New scramble (N, in Patterns) also starts the guide over: all slots unsolved,
no target set by a click, the done list emptied. My cube is solved starts it
over too. Scan my cube and Paint my cube (a jump with no moves) keep the
solved pairs; the current step counts its moves from the jump. A new hold
renames the places, so the pairs solved at that moment become the solved
list and the step starts over. The guide reads in the hold it saw the cross
made in (`lab.f2l.hold`): a turn the tilt detector finds (Experiment 2, the
Turn with the tilt box in the bar, `cw:labTurn`, off by default) that puts
another color on the bottom does not move it, since the
user tipped the cube to look at a slot and the cross is still where it was.
The cross line then says "Read as held yellow up, green toward you: the tilt
moved the hold in the bar." and the log notes it once. A hold with the same
color down, or one the user picks in the bar, is taken. A step, once begun,
lives through the cross coming apart: the line says "The yellow cross is
apart. The hint makes it again." and the chips and the card stay; the step
ends only when its pair is solved with the cross. Pairs are judged as come
apart only while the cross is made. The window computes only while it is
open.

## The pure part: `lab/f2l.js`

Load it after `js/engine.js` and before `lab/lab.js`. No DOM. The engine's
frame is the cube as held after `reframe`: D is the bottom as held, F the
front as held, and the moves that come out read as held.

```js
F2L_ORDER_DEFAULT = ['FR','FL','BL','BR']
f2lSlotWords(held)            // {FR:{pos:'front right', colors:['green','orange','white']}, ...}: the position as held and the colors of the slot's corner (F, R, D centers as held, in that order for FR; FL: F, L, D; BL: B, L, D; BR: B, R, D)
f2lState(X, done)             // {cross:bool, solved:['FR',...], broken:['FL',...]}: which slots are solved, and which of `done` came apart
f2lPairSolutions(X, slot, keep, {extra:0, limit:60, nodeLimit})
                              // every solution of `slot` keeping cross and `keep`, at the optimal length and up to `extra` longer: {optimal, byLen}, canonical as crossSolutions (no face twice in a row, commuting pairs in one order). The same IDA* as solveF2LPair, continued past the first find at each bound.
f2lNext(X, {mode, order, done, target})
                              // the next target: `target` if set and unsolved, else by mode. {slot, moves, optimal}. Shortest: the fewest moves over the unsolved slots (ties go to the order). By corner: the first unsolved in the order.
f2lThen(X, {mode, order})     // X is the cube after the current hint: the slots still to do, in the order the mode would take them, with each one's move count from the cube after the one before: [{slot, n}, ...]
f2lCombos(X, slot, keep, others, {extra:3, nodeLimit, mode, order})
                              // {also:[{slot, moves, n}], setup:{slot, moves, after, plain}|null, partial}: see Combinations above. `setup.after` is the next slot's optimal after this solution, `setup.plain` the next step's optimal after the plain hint. nodeLimit is the budget of each part.
f2lAlso(X, slot, keep, other, {max, nodeLimit}), f2lSetup(X, slot, sols, {mode, order, budget})
                              // the parts of f2lCombos, so the window runs each in its own setTimeout
f2lDone(start, moves, now)    // how many of `moves` the user has done from `start`: the largest n with applyAlg(start, moves.slice(0,n)).equals(now), as cfopStageDone; -1 when none matches (off the hint). A move off the hint and back again counts as on it.
f2lPart(start, moves, now)    // n when the cube is the first n moves and one quarter of move n, a half turn; else -1
f2lAlong(start, moves, sols, now) // {moves, n} for another of `sols`, or `moves` or one of them with two opposite faces swapped, that the cube is on; null off every one
```

As built: the search runs on the pieces of the goal only (the four cross
edges, and the corner and edge of each slot), through two small move tables,
so a node allocates nothing. `F2L_NODES` (12 million, about half a second at
worst) is the budget of one call; the window gives each combination part 4
million (`F2L_PART_NODES`). Of the shortest solutions, the hint is the one
easiest to turn first (U, R and L before F, then D and B).

`f2lPairSolutions` and `f2lCombos` must respect `nodeLimit` and come back with
what they have: a partial answer is marked `partial:true` and the window says
"some of them" instead of a count. Two-slot goals use the max of the cross
table and both pair tables as the heuristic, as `solveF2LPair` does with
`keep`.

## The UI part: `lab/lab.js`

- `lab.f2l`: `{open, mode, order, target, done:[], step:{slot, start, at, moves, optimal, combos}, log:[], seq, timer}`. `step.start` is the cube when the step began, `step.at` the index into `lab.moves` (as `lab.goal.at`), so the moves the user made for the step are `lab.moves.slice(step.at)`. As built, the step keeps `base` (the cube its current hint starts from, which a move off the hint renews) and `best` (the shortest length when the step began) in place of `start`.
- `labF2LRead(cube)`: the live entry. `labF2LShow(on)`, `labF2LDraw()`, `labF2LPick(slot)`, `labF2LMode(m)`, `labF2LOrderMove(slot, dir)`, `labF2LUse(moves)`, `labF2LReset()`.
- Reuse `labSpoil` for every covered line, with keys `f2l:<step index>:<kind>` so a redraw keeps what is open (`lab.patOpen`).
- Keys: F opens and closes the window. Esc closes the front-most of the Patterns and F2L windows. Add `<kbd>F</kbd>` to the button.
- The window drags as Patterns does: factor `labPatDrag` into `labWinDrag(el, key)` and use it for both, with `cw:labF2LWin` for the place. The default place: right of the Patterns window, under the bar.

## Tests

`test/lab-f2l.js` (pure, through `test/vm-load.js` as `test/lab.js` loads
`lab/smack.js`), on at least 40 random scrambles after a solved cross:

- Shortest and by-corner: every step's moves solve the target, keep the cross and the done slots, and the four steps end with F2L solved.
- A custom order is followed; a click target is taken next and the order resumes after it.
- `f2lPairSolutions` lists every optimal solution once, each solves, none holds a shorter one, and `optimal` matches `solveF2LPair`.
- Combinations: an "also" line solves both slots and is within `extra` of the single; the "setup" line solves the target and its `after` is the true optimal of the next slot from there, less than `plain`.
- `f2lDone` counts a prefix, and a move off the hint gives the longest prefix that still matches.
- `f2lAlong` finds the other shortest solution, or the other order of two opposite faces, that the cube is on, and null off every one.
- Slot words as held: with yellow up and green toward you, FR reads front right, green, orange, white.

In `test/lab.js`: the window opens with F and the button, shows the cross line
before the cross, then the chips and the step card after; the hint is a
covered line with the first move shown; a turn of the fake cube along the
hint marks the move done; the target chip click, the mode switch and the
order arrows change the target; New scramble starts it over; the place is kept.

Add `node test/lab-f2l.js` to the `test` script in `package.json`.

## Not in this round

- A search over all 24 orders for the shortest whole F2L. Greedy is the "shortest" of this round.
- Cross planning beyond the one shortest line (Patterns has the counts).
- The last layer (Patterns names the case).
- Moving the guide to the site's cube tab.
