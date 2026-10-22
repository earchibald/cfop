# F2L on the site: the guide, the tree, and a cube that stays in step

The lab's F2L guide works on a smart cube. This plan brings it to the main
site for every cube: the screen cube in the player, a scanned or painted
cube, and a smart cube. It also fixes the problem that makes a scanned cube
useless after one mistake: the site does not track the real cube, so the
state on the screen drifts from the state in the hands.

## Summary

| Part | What it is | Phase | Where |
|---|---|---|---|
| The shared F2L module | `lab/f2l.js` moves to `js/f2l.js`. The lab and the site load the same code. | 1 | `js/f2l.js`, `test/f2l.js` |
| The arc of a solution | `f2lArc`: what each move of a solution does to the pair, in plain words, so a short search solution has an explanation. | 1 | `js/f2l.js` |
| The basic way | `f2lBasic`: the textbook path for a pair: free the pieces, then one of the 41 cases, with the reason from `F2L_WHY`. | 1 | `js/f2l.js` |
| Resync | `js/resync.js`: find the real state from the reset point and two or three faces; the way back to the reset point. | 2 | `js/resync.js`, `test/resync.js` |
| The Guide panel | The F2L tab gets a Guide mode: chips, the step card with the hint as a drill, the tree of ways, the arc, Then, solved pairs. Manual uncover for a regular cube, automatic for a smart cube. | 3 | `js/f2l-ui.js`, `index.html`, `css/app.css`, `test/f2l-ui.js` |
| Read my cube | The scanner with the painter's palette: a click paints, keys 1 to 6 pick. A refresh scan starts from the state the guide expects and reads only the faces it needs. | 4 | `js/scan.js`, `js/f2l-ui.js` |
| Color tuning | A second reference set for stickerless plastic (GAN), the count read on every read, a frame recorder and a test over real footage. | 5 | `js/scan.js`, `js/scan-assemble.js`, `js/scan-rec.js`, `test/fixtures/real/` |
| The smart cube drives the guide | The cube tab's live state feeds the guide. Return to scramble and Set up from current need no scan. | 6 | `js/f2l-ui.js`, `js/cubetab.js` |

Phases 1 to 3 are built (version 1.17.0), phase 6 with them. Phases 4 and 5
are built in version 1.18.0, except the real footage itself: see Done and
remaining.

## As built

| Item | Note |
|---|---|
| `js/f2l.js` | The lab's module, moved. `f2lState` became `f2lStatus`: the site's `app.js` already had an `f2lState` object. |
| The 41 cases | Nine of the algorithms in `js/algs.js` solved another case than their label (26 and 36 were the same string), so six pair states had no case at all. They are replaced with verified algorithms, and `test/f2l.js` checks that the 41 cover every state once, in the right groups, and move no other slot. |
| Case drills and windows | A case that starts with a turn (`y`) was set up with the turn dropped, so 18 F2L drills and windows and the V perm ended unsolved. `caseState` and `caseSetupMoves` in `app.js` set up the cube as held before the turn. `test/refmoves.js` checks every setup. |
| Set up from current | Goes through `scrambleFromCube` with a `stay` flag, so the page keeps the F2L tab. |
| Smart cube | Phase 6 is in: the Guide follows the cube tab's state (`fgSmartRead`) with the lab's state machine. Untested on a real cube. |
| Read my cube | `fgReadCube` opens the scanner as a refresh scan: the bases are the cube now, then each move still to make of the hint in use, then back along the moves made (`fgReadBases`, `resyncBases`), turned to the engine frame (`fgEngine`). The net starts as the first base, dimmed. A face shown or a sticker painted makes that face count; `resyncFind` runs after each. One candidate: Set up from current or Return to scramble (`fgReadBack`: the way back by `resyncReturn`, the moves made covered again, the cube line says how far off). Six faces given with no candidate: a full read through `assembleScan`, as Use this cube. |
| The palette | The scanner's net takes the painter's palette (`SCAN_PALETTE`, the same order as `PAINT_PALETTE`): a click paints the chosen color and pins it; keys 1 to 6 pick. The net shows the cube itself once it fits or is found, so a repaired sticker shows repaired. |
| Color tuning | `SCAN_REFS_PLASTIC` from the light-mode palette; `classifySamples` tries both sets and keeps the lower total distance (`style` in the result), or the set the Sticker style chip pins (`cw:scanStyle`; the status line says which set a frame read as). The count read (`jointColors`) runs on every six-face read, before the plain read is trusted: a joint read that differs and makes a legal cube wins. `js/scan-rec.js`: with `?rec` in the address, Save frames writes a zip of the last twelve frames of each face with a `truth.json`; `test/scan-real.js` reads every folder under `test/fixtures/real/`. |

## Done and remaining

| Item | State |
|---|---|
| The refresh scan from the Guide | Done. `test/scan-ui.js` and `test/f2l-ui.js` cover it with painted stickers and synthetic frames. Untested with a real camera. |
| The palette on the scanner's net | Done. |
| One net for the scanner and the painter | Not done. The painter (`js/paint.js`) stays its own dialog for the beginner home, the seed bar's Paint cube and the lab: it holds the cube yellow up in the beginner's words, and the scanner's net is in the engine frame. The scanner now does what the plan wanted from the shared net: paint a sticker, pin it, start from a state. Merging the two nets would change the beginner flow for no gain the user sees. |
| Two reference sets, Auto | Done. On synthetic stickerless faces the plastic set reads more frames right (3x3: 130 of 148 against 110; 4x4: 84 against 71); Auto picks it on five frames in six. On stickered faces Auto costs nothing. |
| The count read on every read | Done. |
| The recorder and the real-footage test | The code is done. The footage is not: it needs the owner's Safari, the GAN cube, warm light and low light (`test/fixtures/real/README.md`). Until a folder is there, `test/scan-real.js` only says so. The tuning of the references and the gain clamp against real frames waits for it. |
| The smart cube and the Guide | Phase 6 is built; untested on a real cube. |

## Where we are

| Thing | State today | Problem |
|---|---|---|
| F2L on the site | The F2L tab shows the scramble solved through the cross. Reveal shows the whole pair plan at once. The 41 cases are a drill. | Reveal is all or nothing. There is no guidance, no choice of pair, no reason for the moves. The plan's inserts are search results with no explanation. |
| F2L in the lab | A window guides one pair at a time on the smart cube: the hint as a drill, Shortest or By corner, combinations, Then, solved pairs. | Only in the lab, only for a smart cube. The lab is a separate page. |
| A scanned or painted cube | Six faces or 54 taps give a state. `scrambleFromCube` turns it into a scramble. | After one wrong move the screen is wrong, and the only fix is a full new scan. |
| The scanner's colors | Reference colors are the Rubik's stickers. A per-face white balance, then a joint read of all 54 stickers against the centers (`jointColors`) when the faces do not fit. | Warm or low light pulls red toward orange and white toward yellow. Glossy GAN plastic reflects the screen. The joint read only runs when the plain read fails. |
| The painter | A separate dialog with its own net and palette. | A scan that needs one sticker fixed cannot borrow the painter's palette; the net has a click that cycles colors instead. |

## The design

### One guide, three cubes

The guide reads a state and shows the next pair. Where the state comes from
changes only how the moves are uncovered.

| Cube | Where the state comes from | How a move uncovers |
|---|---|---|
| The screen cube | The player: the scramble, the cross solved for you, and the moves uncovered so far. | The user makes the move on the screen cube: a click on the next covered move, or the Right arrow. The layer turns in the player. |
| A regular cube (scanned, painted, typed) | The last reset point, plus the moves uncovered so far. The site trusts the user to make each move as it uncovers. | The same click or key. The user turns the real cube at the same time. |
| A smart cube | The cube itself, through `cw:smart` events and the cube tab's hold. | The cube uncovers the move when the user makes it. No click. A wrong move shows the way back, as in the lab. |

"Progressive disclosure from obfuscation": the hint is a drill. The first
move is in clear. Every other move is covered. A move comes out of its cover
only when it is made, on the screen or on the cube. No Reveal button opens
the whole line. This is the lab's `labHintLine`, kept as it is.

### The reset point

The guide keeps one reset point: the last state it knew to be true. A loaded
scramble, a scan, a paint, a typed state, or Set up from current, each sets
it. Every state after it is the reset point plus the moves made since.

| Button | What it does | Regular cube | Smart cube |
|---|---|---|---|
| Return to scramble | The moves that bring the cube in the hands back to the reset point. The inverse of the moves made since, when they are known. Else the shortest way back from the two-phase solver. The guide shows them as a drill. | After a refresh scan, or from the moves uncovered so far when the user says the cube is still in step. | At once, from the moves the cube reported. |
| Set up from current | The cube in the hands becomes the reset point. The solved pairs stay solved: they are read from the state. The current step starts over from here. | After a refresh scan, or a paint. | At once. |
| Refresh scan | A scan that reads only the faces it needs to tell the real state from the states the guide expects. | The camera, with the painter's palette as the escape hatch. | Not needed. Scan my cube in the Smart cube dialog does the full read for a cube that lost count. |

Most F2L mistakes are a few moves off the hint, and the moves are mostly top
and right turns. So the way back is usually two to four moves, and the states
to tell apart differ on the top layer and one or two sides. Two faces often
decide; three almost always. The resync asks for more faces only while more
than one state fits.

The reading of "Return to scramble (top layer)": the return moves are mostly
top-layer turns. The guide does not restrict them to the top layer.

### Resync: the state from the reset point and a few faces

`js/resync.js`, pure, no DOM.

| Function | Does |
|---|---|
| `resyncBases(reset, hint, done)` | The states the guide expects: the reset point, and the reset point after each prefix of the hint. Each is a base. |
| `resyncFind(bases, faces, {depth})` | Every state within `depth` face moves of a base (3 by default) whose stickers agree with the scanned faces. `faces` is a map from face index to its nine colors, in the engine's frame. Returns `{candidates:[{cube, base, moves}], unique, ask}`. `ask` is the face whose scan would split the candidates best, or null when one candidate is left. |
| `resyncReturn(current, target, {timeMs})` | The moves from `current` to `target`: the two-phase solver on `target⁻¹ · current`. |

Candidates are sorted by distance from their base, nearest first. With one
candidate the dialog says "Found it: two moves off the hint." With more it
asks for the face `ask` names. With six faces and no candidate within
`depth`, the dialog falls back to a full read: the six faces go through
`assembleScan` as today.

### The Guide panel

The F2L tab gets a third mode button: Guide, the default. Live and The 41
cases stay.

The panel, top to bottom:

1. **The cube line.** "Your cube: the screen" or "scanned 14:02" or the smart
   cube's name. Buttons: Read my cube, Return to scramble, Set up from
   current. Return and Set up are enabled once a move has been uncovered or
   a smart cube has moved.
2. **The cross line.** As in the lab: "White cross on the bottom: made", or
   the shortest cross as a drill.
3. **The four pairs as chips.** As in the lab: the position as held and the
   colors of the corner, a check when solved, the accent outline on the
   target, a click makes a waiting pair the target.
4. **The mode switch.** Shortest, By corner, and Order, as in the lab.
5. **The step card.** The target, the hint as a drill, the count, and the
   arc under the hint: short labels at the move where each thing happens.
   "corner comes up", "pair joins", "pair goes in". A wrong move on a smart
   cube shows the way back and New hint from here.
6. **The tree: other ways.** Collapsed lines under the card, one per way.
   Each line names the way and its count. A click opens it in place of the
   hint.

   | Way | Where it comes from | Why show it |
   |---|---|---|
   | Shortest | `f2lNext`, the plain hint | The fewest moves. Often the hard one to see. |
   | Basic | `f2lBasic`: free the pieces, then case N | The textbook way. The reason is the case group's text from `F2L_WHY`. The case links to its details. |
   | Also makes | `f2lAlso` | Two pairs in one go, a few moves longer. |
   | Sets up | `f2lSetup` | The next pair becomes short. |

   The tree is the "F2L tree" of the request: the cube now, the pairs, the
   ways, the moves. The panel shows one branch open at a time.
7. **Then.** The pairs after this one with their counts, as in the lab.
8. **Solved pairs.** Each step solved, the moves made, the shortest at its
   start.

Keys: N for a new scramble, Right arrow uncovers the next move on the screen
or regular cube, Left arrow covers it again (the player steps back). H does
nothing in Guide mode: there is no Reveal. The `.hk` badges follow.

On the phone the panel stacks the same way. The chips go two per row.

### The arc: why these moves

A search solution has no name and no story. `f2lArc(X, slot, moves)` tracks
the corner and the edge through the moves and names what happens after each
one. The labels are short and few.

| Event | When |
|---|---|
| corner comes up | The corner leaves a slot for the top layer. |
| edge comes up | The edge leaves a slot for the top layer. |
| corner over its slot | The corner sits at the top corner above the target slot. |
| pair joins | The corner and the edge are one of the four basic inserts, with any top turn. |
| pair goes in | The slot is solved. The last event. |
| cross edge out / cross edge back | A cross edge leaves the bottom and comes back. |
| another pair out / another pair back | A kept slot comes apart and goes back. |

The basic way gets its arc too, plus the case group's reason. So each way in
the tree has the same kind of explanation, and the user can compare: the
basic way says "corner comes up, pair joins, pair goes in" in eleven moves;
the shortest says "cross edge out, pair joins, pair goes in, cross edge back"
in seven.

### Read my cube: the scanner with the painter's palette

One dialog, two ways to fill the same net. As built, the net is the scanner's
and the palette is the painter's; the painter stays a dialog of its own (see
Done and remaining).

| Part | Today | Planned |
|---|---|---|
| The net | The scanner has one, the painter has another. | The scanner's net, with the painter's palette beside it. Built. |
| A click on a sticker | The scanner cycles the color. The painter paints the chosen color. | Paints the chosen color. The palette keys 1 to 6 work in both. Built. |
| The camera | Fills the net face by face. | The same. A painted sticker is pinned, as today. Built. |
| The start state | Empty. | For a refresh scan, the net starts as the state the guide expects, dimmed. The user shows a face, or paints the stickers that differ. Either way the resync runs. Built. |
| The result | Use this cube loads a scramble. | Set up from current or Return to scramble from the resync; Use this cube after a full read. Built. |

The dialog opens from Read my cube in the Guide panel, from Scan cube in the
seed bar, and from the Smart cube dialog as today. Paint cube in the seed bar
keeps the painter.

### Color tuning

Three changes, each testable on its own.

1. **A second reference set.** Built. `SCAN_REFS` is the Rubik's stickers.
   `SCAN_REFS_PLASTIC` is the light-mode palette in `docs/design-language.md`,
   sampled from GAN product photos. `classifySamples` tries both sets and
   keeps the one with the lower total distance over the face. The Sticker
   style chip in the dialog, Stickers or Stickerless, pins the set; Auto is
   the default (`cw:scanStyle`).
2. **The count read for every read.** Built. `jointColors` ran only after the
   faces failed to fit. It now runs on every six-face read: each color is on
   nine stickers, and the assignment that minimizes the total distance under
   that constraint settles red against orange and white against yellow when
   the light leans warm. A joint read that differs from the plain read and
   makes a legal cube wins; else the plain read stands and the repairs follow
   it. The Hungarian solver was already there.
3. **Real footage.** The harness is built, the footage is not. Synthetic
   frames are a proxy. `js/scan-rec.js` records: with `?rec` in the address,
   the Scan cube dialog keeps the last twelve frames of each face as it locks
   and Save frames writes them as a zip of PNG files with a `truth.json`.
   `test/scan-real.js` reads every folder under `test/fixtures/real/`: each
   frame through `readFace` with Auto and with each set pinned, the frames of
   each face through the voter, the locked faces through stage 5. Record the
   GAN cube in warm light and in low light, then tune the references and the
   gain clamp against these, not against the synthetic renderer.

### The smart cube drives the guide

The cube tab (`js/cubetab.js`) already holds the live cube, the hold and the
move list. The guide listens to `cw:smart` and reads the cube as held. The
lab's `labF2LRead` state machine moves to `js/f2l-ui.js` as it is: on the
hint, off a begun hint with the way back, a half turn made as a quarter, the
other order of two opposite faces. The lab window then calls the same code.

## Phases

| Phase | Deliverable | Tests | Version |
|---|---|---|---|
| 1 | `js/f2l.js` shared; `f2lArc`, `f2lBasic`, `f2lUnrotate`. The lab loads it from `js/`. | `test/f2l.js`: the lab's tests, plus the arc on every shortest hint ends with "pair goes in"; the basic way solves every pair on 40 scrambles and names a case. | 1.17.0 |
| 2 | `js/resync.js`. | `test/resync.js`: 1 to 3 moves off a hint prefix, two or three faces find the true state; six faces are unique; the return moves bring the cube back. | 1.17.0 |
| 3 | The Guide panel on the screen cube and a regular cube, manual uncover, the tree, the arc. | `test/f2l-ui.js`: Guide is the default, chips and the card draw, Right arrow uncovers one move and turns the player, the tree opens a way, N starts over. | 1.17.0 |
| 4 | Read my cube: the palette on the scanner; the refresh scan. Built. | `test/scan-ui.js`: a click paints and pins, the keys pick, the style chip is kept, the net starts prefilled, painted stickers and shown faces find the cube, Set up and Return hand it back, six faces far off are a full read. `test/f2l-ui.js`: Read my cube from the Guide, the way back, the cube read as the scramble. | 1.18.0 |
| 5 | Color tuning: the two sets, Auto, the count read, the recorder, the real-footage test. Built; the footage and the tuning remain. | `test/scan-real.js` over `test/fixtures/real/`. | 1.18.0, the tuning 1.18.x |
| 6 | The smart cube drives the guide; Return and Set up at once. | `test/f2l-ui.js` over `test/fake-gan.js`. | 1.19.0 |

## Open decisions

| Question | Default taken |
|---|---|
| Does the Guide replace Live mode? | No. Live stays for the Reveal-the-plan habit. Guide is the default. |
| How deep does the resync search? | Three moves from each base. Four costs about thirteen times more states and is rarely needed. A knob in code, not in the UI. |
| Which faces does the refresh scan ask for first? | Whatever the user shows. The dialog suggests the top first, since F2L mistakes are top turns most of the time. Once more than one state fits, it names the face that splits them best. |
| A painted sticker on a face not shown | The whole face counts as given: the painted stickers as painted, the rest as the guide expects. The user paints what differs; the rest is confirmed by the paint. |
| The joint read against a legal plain read | The joint read wins when it differs and makes a legal cube. A correct plain read is the least-cost assignment against its own references, so the joint read moves it only where the centers say the light has shifted the colors. |
| The basic way when a piece sits in another slot | Free it with the shortest moves that keep the cross and the solved pairs, then the case. Two free steps when both pieces are stuck. |
| Hold | The guide reads the cube as the player holds it: the cross color from the Solve tab's cross select, as today's F2L live mode does. |
