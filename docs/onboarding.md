# Onboarding by cube level

## Run it

```sh
scripts/dev.sh start [--port N] [--host H] [--no-vendor]   # http://127.0.0.1:8180/ (default port 8180)
scripts/dev.sh stop
scripts/dev.sh restart [--port N] [--host H] [--no-vendor]
scripts/dev.sh status | log | open                          # open: /?onboard in the browser
scripts/sync-main.sh [--no-test] [--push]                   # rebase on origin/main, test, restart
```

Open `http://127.0.0.1:8180/?onboard` to see a first visit on every load. The options are in the
table at the top of [`README.md`](../README.md). Commit before `scripts/sync-main.sh`: it refuses a
dirty work tree.

## Where it comes from

The Design canvas "Onboarding Storyboard" (https://claude.ai/artifact/3KnzhEyCMfrhgewan3xivg, 29
frames, read 2026-10-27). This branch builds it into the site as a first pass. Expect large changes.

## Frame by frame

| Frame | Built in | Notes |
|---|---|---|
| 0 · Welcome: your cube level | `js/start.js` (`START_SCREENS.level`) | Opens on a first visit (no `cw:method`, no `cw:level`) in place of the method menu. Also: Paste my data, and Skip: look around first. |
| 0 · Where each level goes | `LEVELS` in `js/start.js` | The routing table is the code, not a page. |
| 1.1 Do you have a cube? | removed in 1.49.0 | See "Rework 1" below: the basics come first, the cube question after them. |
| new · Meet the cube | `t1-what` | Basics 1 of 4. What the cube is: six faces, nine stickers each, solved is one color per face, a turn mixes it. Show me a turn turns one face on the picture and back, with no letter. |
| 1.3–1.5 Basics: hold, pieces, six moves | `t1-hold`, `t1-pieces`, `t1-moves` | Basics 2, 3 and 4 of 4. One picture for everyone: a drag looks around it, no key turns it, no My cube / Screen cube switch. On the pieces page a kind lifts its pieces out and back (see Rework 2), and Find it is a click on the picture. The hold and moves pages light stickers with the picture's `fade`. The moves page is the first page with a move letter. Show me turns the layer and back. |
| new · The six moves, short | `t2-moves` | Level 2 only, before 2.1: the letters, the ′, the hold in one line, the same move buttons and Show me. It does not mark Basics. |
| 1.6 Basics learned | `t1-done` | Reaching it marks `beg-0` finished. Next: pick your cube goes to 2.1. |
| 2.1 Which cube will you use? | `t2-cube` | Level 1 after the basics; level 2 after its short six-moves page (Back goes to it). Smart cube opens the Smart cube window after. Screen cube goes through 1.2 first. |
| 1.2 Meet the screen cube | `t1-keys`, `js/screencube.js` | Only after 2.1, for the screen cube. The lab's four key layouts, Shift for prime, drag to look around, double-click to reset. The last turn is in words ("Right face, clockwise"). On a touch screen the keyboard parts are hidden and six buttons, named in words, sit under the cube. |
| 2.2 Beginner home, no player on top | `js/place.js`, `begCubeLine` in `js/start-app.js` | The cube line under Up next, with Change (the cube menu). |
| 2.3 A step, the cube in the section | `js/place.js` | The lessons keep their own pages; the player is beside them, not on top. |
| 2.4 All learned: on to CFOP | `begCfopCard` | On the Progress tab when Basics and the eight steps are all finished. |
| L.1 / L.2 The section on top | `js/place.js`, `css/start.css` | One cube slot (`#cubeSlot`) in `main.main`, placed by CSS: `body[data-cube]` is `wide` (Scramble and the other Solve tabs: across the top, with the seed bar), `side` (a sticky column, with a scramble pill), or `none` (Reference, Smart cube, Cheat sheet). Nothing moves in the DOM after the start, because `guide.js` and others write their whole section again. |
| L.3 Scramble tab (was Solve) | `index.html`, `app.js` | The rail says Scramble; the tab key stays `solve` (saved `cw:tab` values keep working). The plan is a folded "Reveal a CFOP plan for this scramble". |
| L.4 Skip ahead from the top bar | `startLevelRow` | Your level and Change at the top of the method menu; a Next mark on CFOP when every beginner step is Learned. |
| L.5 Your cube, from any page | `js/cubemenu.js` | The cube chip after the method chip. Sources: Screen cube, My cube, Smart cube (`cw:cubeSrc`). The seed bar's Scan, Paint and Smart cube are hidden; the menu has them. |
| 3.1 How do you solve it now? | `t3-start` | Some CFOP goes to 4.1. |
| 3.2 Check off what you know | `t3-check` | Can do it → finished, Shaky → learning, on `beg-0`…`beg-8`. "From memory" starts all on Can do it. |
| 3.3 Beginner steps, in CFOP | `t3-bridge` | |
| 3.4 First CFOP lesson: the cross | `crossLessonShow` | A panel on top of the Cross tab: Find (lights the white edges on the cube), Plan, Do it (Reveal). `cw:crossLesson` keeps the part; Close the lesson ends it. |
| 4.1 Which sets do you know? | `t4-sets`, `START_SETS` | By-feel sets and the full OLL (not in the site) go to `cw:known`. |
| 4.2 Pick the cases | `t4-cases` | Real top-view pictures. F2L, two-look OLL, two-look PLL and the full PLL. |
| 4.3 Quiz | `t4-quiz` | Up to ten Learned last-layer cases, real pictures. Name it: four choices. Do it: the setup moves and a timer. A miss sets the case to learning. |
| 4.4 CFOP opens on what is left | `llShowPanel`, `llFullGroup` | OLL · PLL gets Show (Still to learn, Learning, Learned, All; `cw:llShow`), the plan in one line, Drill Learning, and the full PLL as a group with statuses `pllf-<name>`. |
| 5.1 Setup, one screen | `t5-setup` | Full CFOP marks every case. Hide the time while I solve is `cw:hideTime`. Random-state is the length menu. |
| 5.2 Home is the timer | `timerHomeApply`, `weakDraw` | `cw:timerHome`: a large timer on the Scramble tab, Weak spots (the slowest case drills), Today. |

## Rework 1: the basics before the cube (1.49.0)

**Why.** A true beginner was asked "Do you have a cube?" before they knew what the cube is. If they
picked the screen cube, the next page showed "Last turn: R′", and on a phone the buttons said
U D F B R L: move letters the beginner had not met.

**Level 1 now goes:**

1. **Meet the cube** (`t1-what`): what it is, its faces and colors, what solved means, what a turn does.
2. **Hold it like this** (`t1-hold`): the centers, white up, green toward you, the opposite colors.
3. **Three kinds of pieces** (`t1-pieces`): centers, edges, corners, and find the white and green edge.
4. **The six moves** (`t1-moves`): the face names first, then the letters `U D F B R L` and the ′.
5. **You know the basics** (`t1-done`): Basics is marked Learned.
6. **Which cube will you use?** (`t2-cube`): My cube, Smart cube or Screen cube.
7. For the screen cube only, **Meet your screen cube** (`t1-keys`), then a mixed-up cube in the player.
8. The beginner method, on Learn.

**The rules this keeps:**

- No question about a cube before the basics are done. Pages 1 to 4 say "the picture" and add "Have a
  cube? ..." where it helps. None of them assumes the user has one.
- No move letter on a page before the moves page. `test/start.js` checks the text of pages 1 to 3.
- The picture in the basics takes no keys. A drag looks around it, and a double click puts it back.
- The screen cube's page names a turn in words. Level 2 reaches it without the basics, so it must
  not need the letters either.

**Level 2** (from 1.50.0): a short six-moves page, then the cube question, then the keys page for the screen cube.

**Removed:** `t1-hold`'s My cube / Screen cube switch (`stSrcToggle`), the "Now look at your cube"
label, and the `START.keysNext` routing.

**Open, settled in 1.50.0:**

- Level 2 gets a short six-moves page before the cube question: yes (`t2-moves`).
- Show me a turn on page 1: one face and back, as it is.
- On a phone the picture goes above the text: yes, on every page with a picture beside the text.

## Rework 2: pieces you can see and find (1.50.0)

- **A kind lifts its pieces.** Centers, Edges or Corners lifts those pieces out of the picture with
  a glow, holds them, and puts them back: a solved cube again. The page is not drawn again, so the
  view the user dragged to stays. `screenCube`'s `bump(set, {up, hold, down, stay})` runs the
  tween; `renderCube3D`'s `lift: {set, t, d}` draws it (each lifted piece is a box of its own,
  moved out along the line from the center of the cube; its place shows the plastic; the other
  stickers dim a little; the glow is `--lift-glow`, the accent color).
- **Find it is a click.** "Find and click on the white and green edge." A click on the picture with
  no drag goes to `onPick(index)`. A wrong piece lifts briefly and is named ("That is the white
  center. An edge has two colors. Try again."). The white and green edge lifts and stays out, and
  the callout "You found it!" comes up under the picture with Next: the six moves. Show me lifts the
  edge as a hint. Skip goes on without the puzzle. `START.found` keeps it found on a return.
- **On a phone** the picture is above the text on every split page.

## Not built yet

- csTimer import (5.1 shows the button, turned off).
- Stage times and weak spots from the smart cube (5.2 says so on the page).
- The full OLL: the site has no 57 cases. Its mark is kept in `cw:known.oll`.
- 2.3 as drawn (a hint drill on the step page). The lessons are as before, with the player beside.
- The screen cube on a phone has buttons, not swipes on a face.
- With Screen cube as the source, the six keys of the layout turn the cube in the player, and they win
  over the site's own keys on those letters (A animate, D delete time, C clear times with A W D X · S E).

## Open questions (from the storyboard's sticky)

1. Track 1 basics: one long lesson, or short pages (built: four since 1.49.0, with Meet the cube first; level 2 a short moves page since 1.50.0)?
2. Screen cube: in every section, or only where a section draws the cube (built: the player in any section)?
3. Beginner rail: does Solve my cube become Scramble too (built: no)?
4. Is the level asked again from the top bar menu (built: yes, Your level · Change)?
5. 2x2 and 4x4 first-timers: the same tracks with the Mini and Master guides (built: 3x3 only)?
6. Cube menu: keep the Smart cube rail tab as the live view (built: kept; the menu links to it)?
7. Track 4 quiz: name the case, do it with the timer, or both (built: both)?
8. Track 5: is a csTimer import worth building?
9. Stage times and weak spots from the smart cube: build next, or later?

## Storage added

`cw:level` (1–5), `cw:cubeSrc` (`screen`, `mine`, `smart`), `cw:screenKeys` (a layout id),
`cw:known` (`{cross, f2lfeel, oll}`: 0, 1 or 2), `cw:llShow`, `cw:crossLesson`, `cw:timerHome`,
`cw:hideTime`. Statuses go to the one map, `cw:llStatus`, with the new ids `pllf-<name>` for the
full PLL.

## Tests

`test/start.js` walks the five levels in jsdom, the cube menu, the slot per tab, the level row, the
CFOP card, the Cross lesson, Still to learn and the timer home. `test/method.js`, `test/onboard.js`
and `test/transfer.js` now expect the level picker on a first visit.
