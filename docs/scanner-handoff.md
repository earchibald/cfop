# Camera scanner — design and handoff

Goal: the user shows a physical cube to the Mac webcam, and Twistwright reads
the state with no manual alignment. The result goes to
`scrambleFromCube(cube, name)` in `js/enter.js`, which derives a scramble and
loads it into the trainer.

## Why the last attempt failed

The first scanner drew a fixed 3x3 grid over the video. The user had to hold
the cube so every sticker sat under a grid cell. This needed near-exact
placement and was too fiddly to use. The new scanner must fit itself to the
cube, not the reverse.

## Scope for this phase

- Desktop only. Mac webcam through `getUserMedia`. Mobile comes later.
- One face at a time. The user shows one face, the app reads it, the user
  turns the cube to the next face. Multi-face reads from a corner view are a
  later phase.
- Any face order. The center sticker identifies the face.
- Browser only, plain JavaScript on a canvas. Do not add OpenCV.js unless the
  hand-rolled detector fails on real footage.

## Pipeline

Each stage must be testable on its own with synthetic frames.

### 1. Find sticker candidates

- Downscale each frame to about 320 px wide. Work on that copy.
- Convert to a perceptual space (Lab or HSV). Keep RGB for reference.
- Mark dark pixels (low L). The black plastic between stickers is the
  strongest signal in the frame. Everything else is a candidate.
- Flood-fill non-dark regions of near-uniform color. Keep regions that are
  roughly square, roughly the same area as each other, and compact.
- Output: a list of blobs with centroid, area, mean color, bounding box.

### 2. Fit a 3x3 lattice

- From the candidate centroids, find a set that fits a 3x3 grid under a
  homography. Four or more good stickers are enough to fit it. RANSAC over
  candidate quadruples or a simpler approach: pick the largest cluster of
  similar-area blobs, estimate the two grid axes from nearest-neighbor
  vectors, then solve for the grid origin and spacing.
- Once fitted, predict all nine cell centers. A finger or glare can hide a
  sticker; the lattice fills it in.
- Reject the frame when fewer than six cells land on a candidate blob or the
  fit residual is high.
- Output: nine sample points in frame coordinates, plus a confidence.

### 3. Read colors

- Sample a small disc at each predicted cell center, not the whole cell. Glare
  and edges live at the borders.
- Estimate the light from the frame: the brightest near-neutral region, or the
  running mean of all nine samples. Correct the samples for it.
- Classify each sample against the six reference colors in Lab. Return the
  index and the distance to the nearest and second-nearest reference. Low
  margin means low confidence.

### 4. Vote across frames

- Keep a vote tally per facelet for the current face. Each accepted frame adds
  one vote per cell.
- A face is "read" when every cell has a winner with a clear margin over a
  run of about ten frames. Then lock it, flash the net, and prompt for the
  next face.
- The center cell decides which face the tally belongs to. If the center
  color matches a face already read, treat it as a retake.
- Reset the tally when the detected center color changes.

### 5. Assemble and repair

- Six faces give 54 facelets. Pass them to `fromFacelets`.
- The user may hold a face in any rotation. For each face try all four
  rotations; pick the combination that makes `fromFacelets` succeed. Try the
  first face at rotation 0 and search the other five (4^5 = 1024 combos; it
  is cheap).
- If still illegal, try the two usual color confusions, red/orange and
  white/yellow, as whole-face swaps.
- Report what was changed on the status line. Then call `scrambleFromCube`.

## UI

- A "Scan cube" button in the top bar beside "Enter a scramble".
- A modal with: the live video (with a "Mirror" checkbox that flips the
  preview only, never the pixels read), an overlay that draws the fitted
  lattice and the current color read for each cell, a 2D net that fills in
  as faces lock, a status line, and a "Use this cube" button that enables when
  the cube is legal.
- Clicking a net sticker lets the user correct a color by cycling through the
  six. A corrected sticker is pinned and not overwritten by votes.
- Keep the camera stream running until the modal closes. Stop all tracks on
  close.

## Tests

- `test/scan-synth.js`: render synthetic faces to a canvas (node-canvas or a
  pure array renderer) with random tilt, scale, offset, lighting tint and
  noise. Assert that stage 1-3 return the right nine colors in at least 95%
  of trials.
- `test/scan-assemble.js`: take a random `Cube`, split its facelets into six
  faces, rotate each face randomly, and check that stage 5 recovers the cube.
- Keep `npm test` green.

## Files to create

- `js/scan.js` — stages 1-4 and the UI. Load after `js/enter.js`.
- `js/scan-assemble.js` — stage 5, pure functions, no DOM, so it tests in node.
- Styles for the modal go in `css/app.css` under a `/* scanner */` comment.

## Known constraints

- The old artifact ran in an iframe and Safari refused camera access without
  a prompt. GitHub Pages serves the page top-level, so `getUserMedia` should
  prompt normally. Confirm this first with a two-line test before building
  the detector.
- `getUserMedia` needs a secure context. `npm run serve` on localhost counts.
- The Mac webcam is often 1280x720 at 30 fps. Downscale before processing or
  the frame loop will stall.

## Later phases (not now)

- Read two or three faces from one corner view.
- Mobile layout and rear camera.
- Smart-cube input over Web Bluetooth (Chrome only) as an alternative path.
