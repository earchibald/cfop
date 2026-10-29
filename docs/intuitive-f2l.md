# Intuitive F2L: the plan

The owner's notes of 2026-10-29: "picking the CFOP F2L cases is not useful. We need to teach
Intuitive F2L algorithms to people — at first demonstrated as in the cube basics, and then with
drills based on the actual cube." This is the plan for that track. Nothing of it is built yet.

## What there is now

- The F2L tab has three modes: Guide (the default; one pair at a time on the scramble, the hint
  as a drill, `js/f2l-ui.js`), Real cross-solved states, and The 41 cases (pick cases, train
  them). The 41 cases mode is the "picking the cases" the notes reject as the way in.
- `js/f2l.js` already has what a teacher needs: `f2lBasic` (free a stuck piece, then one of the
  41 cases, with `F2L_WHY`), `f2lArc` (what each move does to the pair, in plain words),
  `f2lJoined` (the pair is made and one trigger puts it in), `f2lPairSolutions`, `f2lStatus`.
- The basics pages (`js/start.js`) show how to demonstrate: pieces lift out and back with a glow
  (`screenCube`'s `bump`), a layer glows with its words and then turns (`stMoveShow`), the
  picture turns to show the side that matters.
- The cube in the hands now drives the player on any tab: the virtual cube's keys and the Keys
  window (`js/vcube.js`), and a smart cube in step with the page (`js/live.js`).

## The track: five lessons, then drills

Each lesson is one page in the style of the basics: a few short sentences, a cube that shows the
idea with lifted and glowing pieces, and one try on the cube before the next page.

1. **The pair.** A corner and an edge that belong together: the two colors they share. Find the
   pair for the front right slot (the click-to-find of the pieces page). Lift both out.
2. **The trigger.** R U R' and its mirror: the slot opens, the top turns under it, the slot
   closes. The slot glows while it is open. Insert a pair that is already made (the four
   basic inserts of `f2lJoined`).
3. **Make the pair on top.** Corner and edge both on top: hide the edge-or-corner from the
   slot, move the other, join them, insert. Each move in words from `f2lArc` ("the corner goes
   away from the edge"), one move at a time, the words lit as the layer turns.
4. **Free a stuck piece.** A piece in the wrong slot or twisted in its own: one trigger takes it
   out to the top, and lesson 3 follows (`f2lBasic`'s first step).
5. **Look ahead and keep it short.** Two ways to the same pair; the shorter one keeps the other
   slots. Where two parts join, show both and the moves that cancel (the join of
   `js/crosslook.js`, `lookJoin`).

Drills after each lesson, on the cube the user has: the F2L guide's drill (first move clear, each
next move covered until it is made) on states made for that lesson's case group, from the
current scramble where one fits, so the drill is "based on the actual cube". With a smart cube or
the virtual cube the drill reads the moves as they are made; with a regular cube Read my cube or
Return to scramble resyncs.

## Where it lives

- A fourth F2L mode, Learn, first in the row and the default for a user who has not finished the
  lessons; Guide stays the default afterwards. The 41 cases moves under the Reference.
- The lesson state in `cw:f2lLearn` (the last lesson, each lesson's drills done), statuses as
  `f2l-learn-N` in `llState.status`, so the Progress tab counts them.
- A test per lesson: the demo state, that each demo plan solves its pair and keeps the cross, and
  that each drill state belongs to the lesson's case group (`f2lStatus`).

## Open decisions for the owner

- Five lessons, or fold 4 into 3?
- Should The 41 cases stay on the F2L tab at all, or only in the Reference?
- Drill states: from the current scramble only (real, but a case group may not appear), or made
  for the lesson (every case group, but not "your" scramble)?
