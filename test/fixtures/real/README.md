# Real footage for the scanner

`test/scan-real.js` reads every folder here. Each folder is one recording: the
frames of each face as PNG files and a `truth.json` that names the colors of
each face. The recorder in the site writes both.

To record:

1. Run `npm run serve` and open `http://localhost:8000/?rec` in Safari (the
   `?rec` shows a Save frames button in the Scan cube dialog).
2. Scan the cube. Fix any wrong sticker on the net before you save; the truth
   follows the net.
3. Press Save frames and unpack the zip into a folder here, named for the cube
   and the light: `gan-warm`, `gan-low`, `stickers-daylight`.

Keep each folder small: a dozen frames of each face at 320 px is about 2 MB.
The voter needs ten frames of a face to lock it, so keep at least ten.
