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
| 0 · Where each level goes | `LEVELS` in `js/start.js` | The routing table is the code, not a page. Four levels from 1.54.0 (see Rework 6); the ids stay 1, 3, 4, 5. |
| 1.1 Do you have a cube? | removed in 1.49.0 | See "Rework 1" below: the basics come first, the cube question after them. |
| new · Meet the cube | `t1-what` | Basics 1 of 4. What the cube is: six faces, nine stickers each, solved is one color per face, a turn mixes it. Show me a turn turns one face on the picture and back, with no letter. |
| 1.3–1.5 Basics: hold, pieces, six moves | `t1-hold`, `t1-pieces`, `t1-moves` | Basics 2, 3 and 4 of 4. One picture for everyone: a drag looks around it, no key turns it, no cube switch. On the pieces page a kind lifts its pieces out and back (see Rework 2), and Find it is a click on the picture. The hold page's two lines are buttons (see Rework 3); the hold and moves pages light stickers with the picture's `fade`. The moves page is the first page with a move letter. Its twelve buttons turn the move and back (see Rework 4). |
| new · The six moves, short | removed in 1.54.0 | Level 2 is part of level 1 now. |
| 1.6 Basics learned | `t1-done` | Reaching it marks `beg-0` finished. Next: pick your cube goes to 2.1. |
| new · Your first solve | `t1-ready` | A regular cube only, after 2.1, one page (Rework 7): Is your cube solved? A small solved cube; scramble it up; then Scan it with the camera or Paint the colors by hand. Each goes to Solve my cube. |
| new · The hold screen | `gdHoldHTML` in `js/guide.js` | A screen of its own in the guided solve before the first part and wherever the top changes: "Now, hold the cube with the YELLOW CENTER on top and the GREEN CENTER facing you." The player beside it shows the real cube held that way, to drag round, with Hidden faces (Rework 7). |
| 2.1 Which cube will you use? | `t2-cube` | Level 1 after the basics (Back goes to them). Regular cube is first and the default, lit with the glow, and goes to Your first solve; Smart cube connects, on Solve my cube; Virtual cube goes through 1.2 first (see Rework 5). |
| 1.2 Meet the virtual cube | `t1-keys`, `js/screencube.js` | Only after 2.1, for the virtual cube. Two key sets that work at once: A W D X · S E and the numeric keypad's 4 8 6 2 · 5 9, drawn side by side; Shift for prime, drag to look around, double-click to reset. The last turn is in words ("Right face, clockwise"). On a touch screen the keyboard parts are hidden and six buttons, named in words, sit under the cube. |
| 2.2 Beginner home, no player on top | `lnHomeHTML` in `js/learn.js`, `begCubeLine` in `js/start-app.js` | As drawn from 1.54.0: Up next with the step's goal, the cube line with Change, Start the step and Solve my cube with help; the steps with their statuses beside it. |
| 2.3 A step, the cube in the section | `js/place.js` | The lessons keep their own pages; the player is beside them, not on top. |
| 2.4 All learned: on to CFOP | `begCfopCard` | On the Progress tab when Basics and the eight steps are all finished. |
| L.1 / L.2 The section on top | `js/place.js`, `css/start.css` | One cube slot (`#cubeSlot`) in `main.main`, placed by CSS: `body[data-cube]` is `wide` (Scramble and the other Solve tabs: across the top, with the seed bar), `side` (a sticky column, with a scramble pill), or `none` (Reference, Smart cube, Cheat sheet). Nothing moves in the DOM after the start, because `guide.js` and others write their whole section again. |
| L.3 Scramble tab (was Solve) | `index.html`, `app.js` | The rail says Scramble; the tab key stays `solve` (saved `cw:tab` values keep working). The plan is a folded "Reveal a CFOP plan for this scramble". |
| L.4 Skip ahead from the top bar | `startLevelRow` | Your level and Change at the top of the method menu; a Next mark on CFOP when every beginner step is Learned. |
| L.5 Your cube, from any page | `js/cubemenu.js` | The cube chip after the method chip. Sources: Regular cube, Virtual cube, Smart cube (`cw:cubeSrc`: `mine`, `screen`, `smart`). The seed bar's Scan, Paint and Smart cube are hidden; the menu has them. |
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

## Rework 3: the hold, shown on the picture (1.51.0)

- **No checkboxes.** "White center on top" and "Green center toward you" are buttons.
- **White center on top** lifts the top layer up out of the picture with the glow and puts it back.
  The words "White center on top." light up and rise with it, and fall back as it goes down.
- **Green center toward you** lifts the front layer, then the right layer. "Green center toward
  you." lights with the front layer, then "Red is then on your right." with the right layer.
- `stHoldShow` in `js/start.js` runs it: `ST_HOLD` names the layers, `bump(stLayer(f), {dir})` moves
  a layer as one along its face's normal (`renderCube3D`'s `lift.dir`), and `.st-hl.on` lights the
  words for the up and hold of each bump. A new click starts over. The page is not drawn again.

## Rework 4: the moves as two rows (1.52.0)

- **The bug.** Show me turned a clockwise move twice: `invertAlg(['U'])` gives the string `"U'"`,
  and `[0]` of it is `"U"`. A prime move came back right only by chance.
- **Two rows of buttons.** `U D F B R L` over `U′ D′ F′ B′ R′ L′`. The ′ switch and Show me are gone.
- **A click shows the move and its way back.** U lights its button with the glow, the U layer lights
  on the picture, and U turns. Then U′ lights and turns it back. A click on U′ does U′, then U. The
  line under the buttons names each move in words as it lights. The picture ends solved.
- `stMoveShow` in `js/start.js` runs it, with the times in `ST_MOVE_T`; the turn is slower than a
  key's (`screenCube`'s `turn(move, {dur})`). A new click starts over from solved.
- **The words.** The faces are a list, "with front facing you": Up (the top), Down (the bottom),
  Front, Back, Right, Left. Then: "Relative to you, the letter for a face turns that face
  clockwise. A ′ after the letter turns it the other way. We call the marking "prime", so a
  counterclockwise R′ is pronounced "R prime"." Level 2's short page keeps its own one-line intro.

## Rework 5: Regular, Smart and Virtual; the Mac app (1.53.0)

- **The names.** My cube is **Regular cube** and Screen cube is **Virtual cube**, in the chip, the
  cube menu, the getting-started pages and the F2L guide. The ids stay (`mine`, `screen`), so a
  saved `cw:cubeSrc` keeps its meaning.
- **The default.** Regular cube is the first card of "Which cube will you use?" and is chosen at the
  start; the chosen card has the accent glow, not a plain border.
- **The keys.** Only A W D X · S E, and the numeric keypad: 4 8 6 2 · 5 9 (left, up, right, down
  around the front, 9 the back). Both work at once, so there is no layout to choose; the cube menu's
  Keys action is gone. Shift turns the other way; on the keypad with Num Lock on (Windows sends
  Shift+4 as a Left arrow) a key that gives no digit counts as Shift (`screenKeyShift`). "Six keys
  turn the faces" is now "Use the keyboard or numeric keypad to turn the cube faces." The lab keeps
  its own four layouts.
- **The Mac app.** `smartInApp()` (`js/smart-ui.js`, from 1.47.4: the app's message handler is there) says the page is
  in the app's own window. There the smart cube text names no browser: "The app connects to your
  cube over Bluetooth" (`smartHowWords` in `js/smart-ui.js`), and `smartMode()` is `bridge` before
  the link is open.
- **Settings.** The app's Twistwright menu has Settings… (Cmd+,), which opens the site's Settings
  window in the main window (`showSettings` in `mac/Sources/App.swift`). In a browser Cmd+, stays the
  browser's. It reaches users with the next Mac app release.

## Rework 6: one first level, straight to the first solve (1.54.0)

- **One level.** "Never touched one" and "Played but never solved" are one level: **I've never solved
  one!** Its id stays 1. A saved `cw:level` 2 reads as 1 (`startLevel`), so the method menu's level
  row still names it. The level 2 short moves page (`t2-moves`) is gone.
- **The basics, then the first solve.** The four basics pages and the cube question are as before.
  Then:
  - Regular cube: **Your first solve** (`t1-ready`). It is solved: Mix it up with me. It is mixed up:
    Scan it with the camera, or Paint its colors. Each closes the pages on Solve my cube.
  - Virtual cube: the keys page, then a mixed-up virtual cube and the guided solve (`t1-solve`).
  - Smart cube: Solve my cube with the connect begun (`smartConnectNow`, in the click's own tick).
- **White on top, then yellow on top.** The basics and the mix-up hold the cube white on top. The
  guided solve now stops on a **turn-over screen** wherever the top changes, in place of a dashed
  `z2` tile inside the first part: "Turn it over: yellow on top", the hold in large words with a
  square of each color ("Yellow on top · Green toward you"), the cube turning over on the picture
  again and again, and the button "Yellow is on top →". The player is hidden there, so the screen is
  first in view. The part after it starts turned over. The beginner method is not yellow up the whole
  way: the white corners (step 3) are done white on top, so there are three turn-overs in a solve
  (to yellow, to white, to yellow). Every part shows the hold too (`gdHoldBadge`). The first-solve
  page, the Solve my cube entry and the end of the mix-up say ahead of time that yellow goes on top.
- **The old beginner home is gone.** No "What does your cube look like right now?", no white-up "Hold
  it like this" picture, no "Show the scramble as letters" link, no long step cards and no "Finished
  all eight?" footer. The Learn home is the storyboard's: Up next with the goal picture, the cube
  line, Start the step and Solve my cube with help, and the steps beside it (`lnHomeHTML`). `#begHome`
  is gone from `index.html`. The CFOP button shows in the Up next card once every step is Learned.
- **Solve my cube** starts with cards for the cube in use (`gdEntryCards`): a regular cube gets Mix it
  up with me and Scan / Paint, the virtual cube a mix-up, a smart cube Connect. Mix it up with me runs
  there now, in place of the cards (`#begMix`). Start with this scramble stays, as one line.
- `body[data-begview]` is `home`, `mix` or `player` (`ask` is gone).

## Rework 7: one first-solve page, the hold in one line, the cube beside the part (1.55.0)

The owner's words, used as written where they gave them.

- **Your first solve** (`t1-ready`) is one page: "Is your cube solved?" with a small solved cube.
  "If so, go ahead and scramble it up! Don't worry — you can do this. Then, we'll either scan it with
  your camera (the easiest way) or you can paint the grid colors by hand." Two buttons: Scan it with
  the camera, Paint the colors by hand. Mix it up with me is not on this page (it stays on Solve my
  cube).
- **The hold screen** takes the place of the turn-over screen. After the scan or the paint: "Now,
  hold the cube with the YELLOW CENTER on top and the GREEN CENTER facing you." Then Start stage 1:
  the daisy. No white on top, no z2, no turn picture, no Show me the turn again. The player beside
  it shows the real scramble held that way: a drag looks around, Hidden faces shows the back. The
  same screen comes before the white corners (white on top) and after them (yellow again), with
  the front the real cube has then. The virtual cube reads "The cube now has …".
- **The part** puts the cube beside the text (`body[data-gd]`, css/start.css): the cube slot, the
  player and the section give their panels to the page grid with `display: contents`. Row 1: the
  cube with the step buttons under it, then the part (the stage line, the title, the hold, the
  steps with their tiles, before and after, the buttons; Open the lesson, Show the whole plan and
  My cube looks different at its top right). Row 2: the key in one strip across the page, Coming up
  at its right end. The player's tile list, its label, its Key panel and the seed bar are hidden
  there: the part holds the moves. Each tile has its face color, a click steps the player to it,
  and the player lights the tile of the move it shows (`gdTileSync`, on the `cw:step` event that
  `applySequence` fires). On a phone it is one column: the cube, the step buttons, the part, the key.
- The captions under the player's tiles no longer cover the face color bar (`.scramble .mt` gap).

## Rework 8: a stage-solved screen (1.56.0)

- After the last part of a stage, a screen of its own (`gdWonHTML` in `js/guide.js`, an entry with
  `won: true`): "You solved the Daisy!" with the real cube large in the player (`body[data-gd="won"]`:
  a wider cube column, no step buttons; on a phone the words first, the cube under them). The
  button is "Move on to White Cross →"; Previous part goes back. The owner asked for it after the
  daisy; every stage but the last has one, by the stage's short name ("You solved the White
  Corners!"). After the last stage, You did it shows as before. The stage bar marks the stage solved
  there, and Coming up on the stage's last part skips the screen.

## Planned: the fat moves, in the CFOP intro

The owner asked for a fat moves page after the six moves, then moved it out of the basics: it
belongs to the CFOP intro (track 3, around `t3-bridge`), not to a first-timer. The buttons are ready:
`stMoveBtns(['u','d','f','b','r','l'], label)` draws them, and `stMoveShow` lights a small letter's
face and the middle layer next to it (`stMoveLayers`, `ST_MID`) and names it "Right two layers". The
page as drafted:

> **The fat moves.** A fat move turns two layers at once: a face and the middle layer next to it.
> Some cubers call it a wide move. A small letter writes it. **r** turns the right face and the
> middle layer together. Some guides write **Rw**. A fat move turns the same way as its face:
> clockwise, relative to you. A ′ turns it the other way, so **r′** is pronounced "r prime".

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

`cw:level` (1, 3, 4 or 5; a 2 from before 1.54.0 reads as 1), `cw:cubeSrc` (`screen`, `mine`, `smart`), `cw:screenKeys` (a layout id; unused from 1.53.0),
`cw:known` (`{cross, f2lfeel, oll}`: 0, 1 or 2), `cw:llShow`, `cw:crossLesson`, `cw:timerHome`,
`cw:hideTime`. Statuses go to the one map, `cw:llStatus`, with the new ids `pllf-<name>` for the
full PLL.

## Tests

`test/start.js` walks the four levels in jsdom, the first solve, the cube menu, the slot per tab, the level row, the
CFOP card, the Cross lesson, Still to learn and the timer home. `test/method.js`, `test/onboard.js`
and `test/transfer.js` now expect the level picker on a first visit.
