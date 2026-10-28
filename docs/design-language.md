# Design language

The cube is the design. Chrome is monochrome. Color carries meaning.

| Part | Rule |
|---|---|
| Dark mode | A black cube with classic stickers. Body `#0b0b0d`, panels as tiles on it, a warm white sticker as the primary button. |
| Light mode | A GAN stickerless cube on a light gray desk. Off-white panels with thin seams, the black core as the primary button. No pure white. |
| Type | The Rubik typeface for text and the timer. Azeret Mono for notation. |
| Shape | Rounded cubies: 16px panels, 10px buttons, 7px chips, hairline borders, a soft top sheen. |
| Footer | One small row at the foot of every page, on the desktop and the phone, left-aligned: 12px text, a 14px GitHub mark, "GitHub Repository" and the version (`v` + `APP_VERSION`, in Azeret Mono). That link goes to the repository. On a Mac desktop only (not an iPad, not the app's own window), a second link follows it: a 14px Mac mark, "Download for macOS" and the release's version in the same mono, to the latest release's zip (`#footMac`, `footMacShow` in `js/smart-ui.js`). It is chrome, not content: the links stay `--muted`, not `--link`, and goes to `--text` with an underline on hover and focus. Add a new item as another inline link in the same row; do not add a second row. |
| Mark | The player cube, solved, half way through R: the same view (yaw -32, pitch 28) and the same code, `cubePolys` in `js/draw.js` with `{move:'R',t:0.5}`. app.js draws it into `#mark` on load. Dark mode shows white up and red right. Light mode shows the same cube with yellow up and orange right, because white vanishes on the light desk. One SVG; `--mk-top`, `--mk-side` and `--mk-bottom` switch with the theme, and `--mk-body` is the plastic. The macOS app icon is the same mark, light and dark, on the desk of each theme: `scripts/mac-icon.js` writes `mac/AppIcon.icon` from this code. |

## Color means something

| Color | Meaning |
|---|---|
| Yellow (`--accent`) | The current move, a case in learning, focus. |
| Green (`--good`) | Solved, finished, best time. |
| Red (`--bad`) | Warn, delete. |
| Orange (`--mod`, `--warn`) | A prime move, a drill, inspection. |
| Blue (`--link`) | A link. |
| White on dark, black on light (`--primary`) | The primary action. |

Each section owns a sticker, set with `data-sec` on the tab, the rail button
and the phone menu item: Solve orange, Cross white, F2L green, OLL·PLL
yellow, Lab blue, Reference red. The `.sec-sq` square and the heading mark
read `--sec`.

## Prime moves

A prime move is colored whole, letter and mark, in bold orange on a tinted
tile. The reader must see that a move is prime without reading the mark.
`R2` is not special: it reads like `R`. The current prime move is a solid
orange tile with white text, so the signal survives the yellow highlight.

## Face colors on moves

A face move carries the color of the face it turns. The move trail
(`css/trail.css`) fills its Now tile with that color and puts a bar of it
under each Recent tile. The player's move tiles (`#scramble`) take the bar.
A hair of the page shows between the fill and the bar, so a yellow face
stays in view under the yellow current tile. On the light page the white bar
has a gray ring all round (`--sticker-W-edge`, none in dark mode), as a
sticker sits in its frame. A played move keeps a softer bar. The color
comes from the center at that place before the move (`seqFaceColors` in
`js/app.js`), so a `z2` or a `y` earlier in the list changes it. A
whole-cube turn and a middle slice (`M`, `E`, `S`) carry no color. The 4x4
has no fixed centers: there the letter names the color, turned on by
whole-cube turns only.

## Tokens

Sticker colors are `--sticker-W Y R O G B`, with `--sticker-X` for a sticker
that does not matter and `--sticker-line` for the gap between stickers. The
dark values are the classic sticker colors lifted for contrast on black;
the blue moved most. The light values follow GAN stickerless plastic as
sampled from matte product photos: a lemon yellow, a grass green with a
yellow lean, an azure blue, a true red and a yellower orange, all at full
saturation so they read as deep plastic, not faded print.
