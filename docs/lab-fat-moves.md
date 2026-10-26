# Fat moves in the smart cube lab

An investigation in the lab (`lab/`): read a fat move as one move. The first
target is r. Today the cube reports r as L.

| Item | Where |
|---|---|
| The detector (pure, no DOM) | `fatDetector`, `fatJudge`, `fatStats` and helpers in `lab/smack.js` |
| The panel, the move list, the hold | `lab/lab.js` (`labFat*`), markup and CSS in `lab/index.html` (`#fatSec`, first in the Experiments panel) |
| Tests | `test/lab.js`: the detector on made-up tilt readings, and the page over the fake bridge (L with the core turned x reads as r, the hold follows, the next move reads as held) |
| Storage | `cw:labFat` (Read fat moves, `off` or on), `cw:labFatOpts` (the knobs), `cw:labFatData` (the last 150 records) |
| Version | `LAB_VERSION` 0.26.0 |

## Why the cube says L

The cube counts the turn of each face against its core. The tilt sensor sits in
the core. The centers are fixed to the core.

An r turns the right face and the middle layer together. The middle layer
carries four centers, so the core turns with it. Against the core, only the
left face moved. The cube therefore reports L, and the core turns a quarter
about the left-right axis, as x does. In moves: r = L x.

The same holds for every fat move: l = R x', u = D y, d = U y', f = B z,
b = F z'. A half turn doubles both parts.

So the tilt carries the whole signal. A face turn leaves the core still. A fat
turn twists the core a quarter turn about the axis of the face the cube names,
the other way from that face's own turn.

## How the detector judges a move

1. The lab notes the time of each move message. The state comes a round trip
   later, so the move message time is the better time.
2. For each move, the detector takes the core's turn from `pre` ms before that
   time to `post` ms after it, in the cube's own frame. The heading does not
   count, so Reset cube and the hold do not matter here.
3. It splits that turn into the twist about the named face's axis and the
   swing off that axis.
4. Twist against the face of `min` degrees or more (90 + `min` for a half
   turn), with swing under `swing` degrees, is a fat move.
5. A move on the same axis close by cuts the window at the half-way point. Two
   fat turns in a row (r r) then each get their own quarter.

| Knob | Default | Meaning |
|---|---|---|
| before ms (`pre`) | 350 | Start of the window, before the move message |
| after ms (`post`) | 250 | End of the window, after the move message. The list waits this long |
| least deg (`min`) | 45 | The least twist against the face for a fat move |
| swing deg (`swing`) | 45 | The most turn off the axis. More is a cube turned some other way |
| Flip the twist (`flip`) | off | Takes the twist the other way. Use it if every fat move shows below the zero line |

## What Read fat moves does

With Read fat moves on (the default), the move list waits `post` ms for the
detector after each move. The picture does not wait.

- A fat move goes on the list as r, not L.
- The hold then moves by the x inside the r, with nothing on the list. The
  next move reads as held: after r, the top layer has the old front center,
  and a turn of it still reads as U.
- Patterns and the F2L guide read each state after its moves, as before.
- Turn with the tilt also sees the x. After a fat move its rest pose starts
  again, so the x does not count twice.

With it off, the list shows the moves as the cube names them. The log still
says what the detector found, and the data still records each move.

## The panel

| Part | What it shows |
|---|---|
| You do now | Anything, Fat turns or Face turns. Each move goes in the data with this label |
| Meter | The last move as read, its twist against the face, its swing, the readings in its window |
| Trace | One line per recent move: the twist against the face, from 800 ms before the move message to 800 ms after. Orange reads as fat, blue as a face turn, red as the opposite of the label. The shaded part is the window. The dashed line is `min` |
| Strip | Every recorded move as a dot at its twist, in a row for its label. The dashed line is `min` |
| Counts | How many of each label the knobs judge right. When the core turns, as a time span about the move message. The best knobs from the labeled data |
| Use best knobs | Sets `pre`, `post` and `min` to the best values from the data |
| Save data | Writes the records and the knobs as `fat-moves-YYYYMMDD-HHMM.json` |
| Clear data | Deletes the records |

A change of a knob judges every record again at once.

## The protocol

Do these steps with the real cube, in Safari through `lab/run.sh`.

1. Connect the cube. Move it until the tilt is live. Clear data.
2. Set your hold in the bar (for example yellow up, green toward you).
3. Pick **Fat turns**. Make r ten times, with a short stop after each. Then
   make r' ten times.
4. Pick **Face turns**. Make L ten times, then L' ten times. Hold the right
   side still, as in a normal L.
5. Pick **Anything**. Make r U R' U' and R U r' U' at your normal speed, ten
   times each.
6. Read the counts and the trace. If the two groups are apart, press **Use
   best knobs**. Do step 5 again and watch the list.
7. Press **Save data**. Send the file from your Downloads folder.

To check in each step:

- Do the r lines rise to about 90° near the move message? If they fall to
  about −90°, the sign is turned: check Flip the twist and say so.
- Where does the rise sit in time? Before the move message, after it, or
  across it? The counts line gives the span.
- How many readings fall in a window? Under five means the tilt reports too
  slowly for a short window.
- Do the L lines stay near zero?

## What the data holds

Each record:

| Field | Meaning |
|---|---|
| `m` | The move as the cube names it (white up, green front) |
| `held`, `read` | The move as held, and the fat move it read as (null when it read as a face turn) |
| `truth` | `fat`, `face` or `any`: the label at the time |
| `lag` | ms from the move message to the state that carried the move |
| `prev`, `next` | ms to the moves on the same axis before and after, or null |
| `samples` | `[dt, [x, y, z, w]]`: each tilt reading from 800 ms before to 800 ms after, dt in ms from the move message, the turn of the body in the axes of `draw.js` |

The file also holds the knobs, the hold, the readings per second (`hz`), the
lab and app versions and the cube's name.

## Open questions

| Question | Why it matters |
|---|---|
| How fast does the tilt report on the GAN 12 ui Maglev? | A slow rate blurs the window and may need a longer `post` |
| Does the core turn before or after the move message? | It sets `pre` and `post`, and so the wait on the list |
| Is the sign as the math says? | Flip the twist exists in case it is not |
| Does a fast r in a trigger (r U R' U') stay apart from L? | Regrips move the core too. The swing knob and the window must reject them |
| Can a regrip just before r hide it? | The window compares its two ends. A whole-cube turn that ends inside the window can cancel the x |

## Next steps

- Decode the 3-bit angular speed per axis in the tilt message (bit 68 for
  gen 2, bit 80 for gen 4; see the lab section of `docs/smart-cube.md`). It
  may show the core's turn sooner and sharper than the difference of two
  readings.
- Slice moves: M is reported as R and L' together, with the core turned x'.
  E and S are the same on their axes. They need two moves in one window.
- When the knobs hold up, move the detector into the Smart cube tab
  (`js/cubetab.js`), where the stage and the case card read the moves.
