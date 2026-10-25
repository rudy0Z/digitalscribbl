# 26 — Design System v5 "The Table" — Craft-Table MVP plan

> **Status:** ACTIVE. First MVP slice of the game-form redesign (2026-10-26).
> Builds on **v4 House Colours** (`.superdesign/house-colours.css`, unshipped) and
> **v3 The Collegiate Volume** (`.superdesign/design-system.md`, unshipped).
> Supersedes nothing yet — Sunlit Lawn stays the live theme until Phase 2 migrates screens.
>
> **MVP rule:** every asset in this slice is a placeholder we built (inline SVG / CSS).
> No licensed assets, no AI generation, no backend dependency. The demo runs at
> `/dev/craft-table` with mock data and is hidden in production (`notFound()`).

---

## 1. The direction

**Concept, one sentence:** *Scribble day happened with shirts spread on a bedsheet and
everyone leaning over with markers — so the app is that surface: shirts laid flat on a
craft table, friends' hands drawing live, every signature a cut-out you tape down.*

**The ground (v2 decision):** the originally proposed green cutting mat is **replaced by
a butcher-paper tabletop** — a paper roll covering a wooden table, taped at the corners,
doodled in the margins. Reasons: paper is the brand's own material (every existing token
set is paper-based), cream `#F2EEE4` keeps the white shirt the brightest mass on screen
(the v4 rule), and "the table" reads as gathering, not as craft supplies.

**Two-surface doctrine (inherited from v3):** handcraft lives in the *world*
(table, clothesline, corner). Utility chrome (settings, admin, auth) stays quiet and
typographic. Handcraft is content, never chrome — unless the chrome *is* the world.

**The one memorable moment:** publishing a mark — it lands, gets a strip of tape, and a
stamped `№ N` counter. Live friends' pencil-cursors are the second moment (Phase 3 makes
them real via Supabase Realtime presence; the MVP mocks them).

## 2. Tokens (additive, isolated — nothing existing is renamed)

Added to `tailwind.config.ts`:

| Group | Values | Use |
|---|---|---|
| `craft` | `ink #191410`, `ink-soft #4A3A20`, `ink-faint #6E5A3C`, `paper #FAF7F0`, `cotton #FFFFFF`, `ground #F2EEE4`, `edge #E4DED0`, `live #D63830` | chrome ink levels, surfaces, the live dot |
| `field` | `marigold #E29A2E`, `cobalt #2F5FA8`, `forest #3F6B4A`, `oxblood #7A2E2E`, `night #191410` | the per-student field (v4 [r4] values, do not drift) |
| `boxShadow.cutout` | `0 10px 24px rgba(25,20,16,.18), 0 2px 6px rgba(25,20,16,.12)` | die-cut objects |
| `fontFamily` | `tdisplay`, `tbody`, `tmono`, `thand` → `--tfont-*` vars | set per-surface by the demo page for now |

Type roles (v4 ladder): **Big Shoulders Display** = display (tracked caps), **Archivo** =
UI body, **IBM Plex Mono** = metadata (11–12px caps, +0.06em), **Caveat** = *content
only* (marks, notes, signatures). Never handwriting in chrome.

## 3. Components (new `components/table/`)

| Component | Job |
|---|---|
| `TableGround` | butcher-paper table: cream ground, faint 24px grid, ruler margin strip, corner tape, coffee ring, ghost marginalia (existing sticker SVGs at low ink) |
| `TapeStrip` | translucent tape piece, torn ends via clip-path, two tones (`masking`, `clear`) |
| `StickerCutout` | **the core primitive** — white die-cut border + `cutout` shadow around any content; radii `blob`/`round`/`sharp` |
| `TableShirt` | flat-lay shirt cutout on the table: canonical `shirtTemplate.ts` geometry (400×600), white cotton, ink outline, dashed stitch seams, fold shading, marks composed in a `foreignObject` clipped to the drawable region |
| `LiveCursors` | multiplayer pencil cursors + name flags (MVP: two mocked friends on sine paths; real: presence broadcast in Phase 3) |
| `InkTray` | quiet instrument tray: 8 marker swatches, 3 nib sizes, undo, primary CTA **TAPE IT DOWN**, secondary **JUST SIGN** |
| `ScrapBox` | shallow tray of draggable scraps: the 12 existing sticker SVGs as die-cut stickers + quick-note paper scraps |
| `CornerPoster` | **My Corner** — replaces the 9-block dashboard: field-colour screen, name in Big Shoulders, proof-of-life counters, shirt + 2–3 taped margin notes, two CTAs |
| `ClotheslineStrip` | **The Clothesline** — replaces explore: sagging rope, shirts on pegs, name tags in mono caps |

Demo harness: `app/dev/craft-table/` (server page + client `CraftTableDemo`), following
the `app/dev/sunlit-lawn/` pattern.

## 4. What is mocked in the MVP

- Data: 3 seeded marks, 2 fake friends, 6 shirts on the line, name/counters — all inline.
- Publish: dragging a scrap or tapping a note places a *loose* mark; **TAPE IT DOWN**
  tapes + numbers it (pure client state). No `/api/scribble/place` call.
- Cursors: `requestAnimationFrame` sine motion, no channel subscription.
- Voice, approval flow, front/back toggle: out of this slice.

## 5. Phases

| Phase | Scope | Status |
|---|---|---|
| 1 — Craft-table MVP | tokens + primitives + demo harness, browser-verified at 2 widths | **this build** |
| 2 — Screen migration | dashboard → My Corner; profile → CornerPoster variant; studio → The Table (real `DrawingCanvas` under the marks layer); explore → Clothesline; onboarding → set-up-table + mandatory share step; House Colours global token swap | next |
| 3 — Backend resurrection | fresh Supabase, kill prototype mode, fix `createClient` union (295 TS errors), Cloudinary for head cutouts (AI background removal → the sticker heads), real presence: cursors + ghost strokes + viewer count on `shirt:*` channels | with 2 |
| 4 — The Volume | yearbook = v3 Collegiate Volume (buckram, foil gold, printed spreads); PNG/ZIP exports composite the cutout heads | after |
| 5 — Ship polish | sounds (tape rip, stamp thud), empty states as craft moments, degraded/free-tier modes, friend test | last |

## 6. Asset policy

Everything in Phase 1 is inline SVG/CSS we authored. Reused as-is: the 12
`public/scribbl/stickers/*.svg` and the canonical shirt paths. Later phases may swap
placeholders for commissioned/CC0 art — keep every primitive's props stable so swaps are
drop-in.

## 7. Round 2 — visual overhaul (2026-10-26, same day)

Round 1 was structurally right and visually unacceptable (founder verdict, correct):
flat ground, clipart shirt, empty composition. Round 2 rebuilt the artwork layer:

- **TableShirt v2** — real garment: straight-fit crew tee, punched-through neck opening
  (`fill-rule: evenodd`), ribbed collar, gradient cotton, blurred fold/side shading,
  double-needle stitching, fiber grain. Drawable region unchanged — mark coordinates
  stay API-compatible.
- **Texture system** — `grain.ts` renders SVG `feTurbulence` to data-URIs; paper, fields
  and the wall all wear the same grain. No flat fills anywhere.
- **TableGround v2** — wood table edge top/bottom, paper-roll shadows, quieter grid,
  ruler with numbers, turbulence-displaced coffee stain, eraser shavings, margin
  doodles at visible (15–28%) ink, handwritten margin notes.
- **InkTray v2** — physical markers (capsule body + cap band + nib) lying in a kraft
  tray; the selected marker lifts off.
- **ScrapBox v2** — kraft cardboard tray, corrugated edge, taped handwritten label,
  stickers piled at deterministic tilts, notes fanned.
- **CornerPoster v2** — poster-scale name (`clamp(52px, 10vw, 118px)`), ghost "26"
  numeral, overlapping taped notes, print-style offset-shadow CTAs, grain on fields.
- **Clothesline v2** — plaster wall, rope with cast shadow, swaying shirts
  (`ct-sway`, reduced-motion aware), taped paper name tags.
- **Torn-paper dividers** between sections; masthead with MVP stamp.
- **Route made static** — no `force-dynamic`. This is also a *reliability* fix: streamed
  responses never finish revealing in some embedded browsers (the round-1 "stuck
  skeleton" bug); static output renders + hydrates everywhere. Production preview:
  `SHOW_CRAFT_DEMO=1` env flag (the `notFound()` guard stays for real deploys).
