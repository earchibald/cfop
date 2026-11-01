# Stage view

The standard view for everything past the beginner guide. The owner picked option C of the design
canvas "Twistwright standard view" (claude.ai artifact PfWE933UM6cUe1NQExMiht), with these choices
from its board C5:

- Sheets: the snap column (C1). Sheets stack in the right third and fold. Drag one off the column to
  float it.
- Sections: the glass rail at the top left (C1, C4).
- Timed solve: focus (C4). Inspection and the solve fade the rest. Solved! brings it back.

Built in 1.62.0 as `js/stageview.js` and `css/stageview.css`.

## Where it is on

CFOP on a computer: a window wider than 760px. The beginner method and the phone keep the page as it
was. `?classic` in the address turns it off for one visit. Settings > Layout turns it off for good
(`cw:stageView`).

## What goes where

| Place | What |
|---|---|
| The stage | The cube, full size. With a cube picked the stage is the page |
| Top left | The rail: each section with its color and its key |
| Beside the rail | The step badge: the section, and what the player shows (or the drill) |
| Top right of the cube | The hold: Top, Front, Net |
| Bottom left | The action bar: the cube source (a click opens the cube menu), Animate, Hidden faces, Virtual cube, Save image |
| Right third | The column: the sheets of the section, then Everywhere (Your moves, Timer), then Add for closed sheets |
| Center | The big moment: the inspection count, the clock, Solved! |

Reference and the Smart cube tab have no player cube. Their sheets fill the stage beside the rail, as
a page of their own.

## Sheets

Each top-level panel of the section in view is a sheet. The module puts a strip at its top: a grip,
the title, fold, dock (only while it floats) and close. The title comes from `SV_TITLES` by panel id,
else from the panel's heading, which then hides. A panel that is a `details` (the CFOP plan) keeps its
strip in its summary, so it shows while folded, and fold opens and closes the details. A panel
that holds a `details` (the full PLL and F2L lists) folds that details.

- Fold: the title or the arrow.
- Close: the cross. Add, at the foot of the column, opens it again.
- Float: drag the strip off the column. The sheet moves to `#svFloats`, a layer over the stage
  (Safari clips a fixed element inside a scrolling column with rounded corners). Drop it on the
  column, or press dock, and it goes back to its place.
- Put back: every sheet of the section open and in the column.

The page keeps the choices by section and sheet in `cw:svSheets`: `{"cross:p1": {"fold": true},
"solve:moves": {"float": {"x": 222, "y": 104, "w": 407}}}`. Everywhere sheets also have a key per
section, so a timer closed on F2L stays on Scramble.

## Focus

The timer's class tells the phase: `insp` is inspection, `run` the solve, `ready` a held Space. A
`MutationObserver` on `#timer` follows it, so `app.js` is unchanged. `body[data-svfocus]` fades the
top bar, the rail, the badge, the hold, the action bar and the column. A hover brings the column or
the rail back. At the stop the Solved! card shows the time, "Your best" when it is the best, the
ao5, Next scramble (N) and Close (Esc). Space also closes it, and goes on to the timer.

## No cube yet

With no `cw:cubeSrc` saved, the stage asks "Which cube do you use?" with the three cubes. A pick calls
`setCubeSrc`. Smart cube also calls `smartConnectNow`, so the chooser opens (or, in Safari, the
download of the Mac app).

## How it moves the page

The module writes no section. `svPut(el, parent)` leaves a comment where the element was and moves it.
`svBack()` puts every element back. It moves the cube slot into `.wrap`, the scramble pill, the seed
bar and `main.main` into the column, Your moves and the timer into Everywhere, and the cube buttons
into the action bar. A `MutationObserver` on `main.main` puts a strip back on the next frame when a
module writes a panel again. The strips write their text only when it changes, so the observer does
not run on its own changes.

## Not built yet

From the boards, for later:

- Pop out (a sheet as its own window): the Mac app's window, the Quest's panel.
- The Layout chip (Solving, Learning, Drill sets of sheets).
- Messages ("Pair solved") and the section's own step on the badge ("F2L · pair 3 of 4").
- The Smart cube tab folded into the cube source and the Everywhere sheets.
- Snap guides for free sheets (C2), the shelf (C3) for a narrow window and the phone.
