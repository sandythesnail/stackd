# Hammy's illustrated face overlays

`app.css` positions a cropped PNG over the CSS pig's eyes/snout inside the pig's unscaled
440x460 coordinate frame (`.hammy-face-overlay`). `mobile/src/hammyFaces.ts` mirrors those
same numbers for the Expo app, so **any change here has to be made in both places**.

Two families:

| Family | Files | Used for |
| --- | --- | --- |
| Daily moods | `*-face.png` | Home mascot's rotating mood (`.mood-*` in app.css) |
| Reactions | `hammy-mouth-happy` / `hammy-mouth-confused` / `hammy-happy` | Transient face after a graded answer in the quest player |

Right and wrong answers (`.happy`/`.gentle`) are both mouth-only overlays now — Hammy keeps its
resting eyes/cheeks/snout, and only a mouth mask (lifted off the source art as an alpha layer)
gets added. `hammy-mouth-happy.png` (from `shockhappy.png`) and `hammy-mouth-confused.png`
(from `newconfusedface.png`) are built by `scripts/make-face.js`'s `buildTwoToneMouth`/
`buildMouth` respectively — see the `HAPPY_MOUTH`/`MOUTH` spec comments there for why they use
different extraction techniques (one mouth is two-tone — outline + tongue — the other is a
single flat stroke). Every-3rd-in-a-row (`.streak`) is the only reaction still a full-face swap,
reusing `hammy-happy.png`. `hammy-gentle.png` and `hammy-streak.png` are the old full-face swaps
`.gentle`/`.happy` used to use — still in the repo, unused, if you ever want to go back.

## The crop recipe

The original `process_faces.js` referenced in app.css was never committed. `scripts/make-face.js`
reimplements it, measured off the existing crops — all of them share one recipe:

1. **Crop a box** from the source artwork whose aspect ratio matches the CSS overlay box
   (the reaction box is 260x200, so 1.3).
2. **Frame it** so the illustrated head renders at the same width as the face you're replacing,
   and the eye line sits at the same relative height in the box (0.397 for the reaction box).
   Both together are what make a new face land on the CSS pig without retuning `top`/`left`.
3. **Resample** to the same pixel size as its neighbours (520x400 for reactions).
4. **Punch out an oval**: alpha 255 inside normalised elliptical radius 0.72, easing to 0 at
   1.03. This is what makes the edges melt into the pig's skin instead of ending on a visible
   rectangle. Verify a new crop with `node scripts/make-face.js --profile faces/<file>.png` —
   the alpha falloff should read roughly `22 85 153 223 255` across the mid-row.

## Source artwork resolution matters

The older sheets (`confused.png`, `sad.png`, ...) are ~950px per pig, so their crops are
*downscaled* into the overlay box and look crisp. `newconfusedface.png` is only ~170px per pig,
so `hammy-confused.png` is upscaled ~2.4x at retina display size and needed an unsharp pass to
hold its edges. If a higher-resolution export of that pig ever turns up, re-run the script on it
and the softness goes away — nothing else has to change.
