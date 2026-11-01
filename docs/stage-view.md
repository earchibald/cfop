# Stage view

The standard view for everything past the beginner guide. The owner picked option C of the design
canvas "Twistwright standard view" (claude.ai artifact PfWE933UM6cUe1NQExMiht), with these choices
from its board C5:

- Sheets: the snap column (C1). Sheets stack in the right third and fold. Drag one off the column to
  float it.
- Sections: the glass rail at the top left (C1, C4).
- Timed solve: focus (C4). Inspection and the solve fade the rest. Solved! brings it back.

Built in 1.62.0 as `js/stageview.js` and `css/stageview.css`. 1.63.0 took the Scramble tab out (Cross is
section 1), put the scramble in Scramble Info (`js/scrinfo.js`), added Undo (`js/undo.js`), Scan or
paint, and Maximize cube. 1.64.0 took the Smart cube tab out: a smart cube is an Everywhere sheet.

## Where it is on

CFOP on a computer: a window wider than 760px. The beginner method and the phone keep the page as it
was. `?classic` in the address turns it off for one visit. Settings > Layout turns it off for good
(`cw:stageView`).

## What goes where

| Place | What |
|---|---|
| The stage | The cube, full size. With a cube picked the stage is the page |
| Top left | The rail: each section with its color and its key |
| Beside the rail | The step badge: the section, and Scramble Info (a dot while the player shows a drill) |
| Top right of the cube | Scan or paint (a regular cube only) and Undo; the hold (Top, Front, Net) under them. None on Reference |
| Bottom left | The action bar: the cube source (a click opens the cube menu), Animate, Hidden faces, Virtual cube, Save image |
| Right third | The column: Current Moves when there are some, the sheets of the section, then Everywhere (Your moves, Timer, Smart cube while a smart cube is the cube, CFOP plan, Weak spots for level 5), then Add for closed sheets |
| Top bar, after the cube chip | Maximize Cube (Minimize Cube while on) |
| Center | The big moment: the inspection count, the clock, Solved! |

Reference has no player cube. Its sheets fill the stage beside the rail, as a page of their own, with
no Undo or Scan or paint over them.

There is no Smart cube section (1.64). A smart cube is a cube of the page: the cube on the stage follows
it, and the Smart cube sheet under Everywhere holds the rest: the Connect card, then the cube's name
and charge, the stage of the solve, the last moves, Clear moves and Listen (`js/cubetab.js`).

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
- Restore panes: every sheet of the section open and in the column.

The page keeps the choices by section and sheet in `cw:svSheets`: `{"cross:p1": {"fold": true},
"solve:moves": {"float": {"x": 222, "y": 104, "w": 407}}}`. Everywhere sheets also have a key per
section, so a timer closed on F2L stays on Cross.

## Scramble Info

The scramble card is gone from the column. "Scramble Info" on the badge (and Info on the scramble pill
where the stage is off) shows a pane on hover; a click keeps it open. In it: the seed and the moves, New
scramble, Restore scramble, Speedy Solve, a seed box, and Back to scramble while the player shows a
drill. Restore scramble asks first; Speedy Solve does not, except on a regular cube.

| Cube | Restore scramble, Speedy Solve |
|---|---|
| Virtual | The pane closes. The player turns the moves fast (`siRun`, `anim.quick`). A key stops the run |
| Smart | The pane closes. Current Moves, at the top of the column, lists the moves. Each turn ticks one off; a turn off the list gives new moves from there. Done at the target |
| Regular | It's solved, or Scan or paint (the camera or the painter). Current Moves lists the moves, and the player holds them as a drill to step through. From solved, the way to the scramble is the scramble |

`siPath(from, to)` turns the whole cube first where the centers differ, then finds face turns
(`resyncReturn`).

## Scrambles

Every new scramble is a WCA scramble: a random state made from a seed name (`js/wca.js`), solved by the
two-phase solver with the first answer of 22 moves or fewer, so a seed always gives the same scramble.
The length menu and the cubing.js pool (`js/scramble.js`) are gone. `scripts/vendor.js` still fetches
cubing.js; nothing loads it.

## Times

One list holds every full solve, Full solves (the timer scope `solve`, the old Scramble tab's list). Cross,
Lab and Reference time into it. On the Cross tab the Full solve box by the timer (on by
default, `cw:timeFull`) can be cleared to time the cross alone, into Cross. F2L and OLL · PLL keep their
own lists, and a case drill times into its case.

## Undo

`js/undo.js` keeps one queue. Before each input (a key, a click, a drag, a change) it takes a snapshot
of the section, the method, the cube source, the scramble, the moves on the player, Animate, Hidden
faces, Net, the hold, `cw:svSheets` and `cw:svMax`; after the input it takes another. The keys that
differ go on the queue with their old values. Undo (the button, Cmd+Z or Ctrl+Z outside a text field)
puts those back. Not on the queue: the Settings window, steps through the player, a smart cube's
turns, and changes that come with no input (the timer's next scramble).

## Maximize cube

The cube gets the page. The rail is a column of color chips with the key number on each; a hover names
the section. The sheets are vertical tabs at the right edge, a grip and a title each. A panel that its
section hides (an F2L mode not in use) has no tab. A click on a tab tears its sheet off: it floats left of
the tabs, under Undo and the hold, at the tab's height, beside the floats already there. Drag a tab off
to float its sheet where it is let go. Drop a floating sheet on the tabs, or press dock, and it is a tab
again. Floating sheets stay where they are. Kept in `cw:svMax`.

A float stays on the stage: under the top bar, so its strip can be grabbed, and on the screen. Its
height ends at the bottom of the window. A float taken by its strip comes to the front. While a sheet
is under the pointer, a redraw of the page leaves it in the float layer (before 1.63.2 a redraw put a
sheet torn off a tab back in its hidden place, and it was kept at 0×0 in the top left corner, under
the top bar). A float kept narrower than 120 px is one of those, and docks again.

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
`svBack()` puts every element back. It moves the cube slot into `.wrap`, `main.main` into the column,
Your moves, the timer and `#everyMore` (the CFOP plan, Weak spots) into Everywhere, and the cube buttons
into the action bar. The scramble pill and the seed bar stay where they are, hidden. A `MutationObserver` on `main.main` puts a strip back on the next frame when a
module writes a panel again. The strips write their text only when it changes, so the observer does
not run on its own changes.

## Not built yet

From the boards, for later:

- Pop out (a sheet as its own window): the Mac app's window, the Quest's panel.
- The Layout chip (Solving, Learning, Drill sets of sheets).
- Messages ("Pair solved") and the section's own step on the badge ("F2L · pair 3 of 4").
- Snap guides for free sheets (C2), the shelf (C3) for a narrow window and the phone.
