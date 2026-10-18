# Aimaq landing-page design system

This is an interpretation of the supplied Bay screenshots, adapted to Aimaq. It applies only to the landing page through `landing.module.css`. Landing-page styles remain isolated. The dashboard now reuses Haffer with its own scoped theme in `dashboard.module.css`; authentication and global typography are unchanged.

## Visual direction

A quiet editorial layout: an off-white canvas, regular-weight sans-serif headlines, generous whitespace, thin borders, broad illustration panels, and alternating product explanations. The screenshots suggest a neutral grotesque font; the exact typeface cannot be identified from images alone. Haffer is used for its clean proportions, warm character, and complete Russian alphabet. The standard proportional family keeps the editorial layout light; the XH and monospace variants are not used.

The accent shifts from the reference's red to the requested powder blue. Dark blue-green text keeps the light blue controls readable. The Taraz illustration gives Aimaq a local identity instead of reproducing the reference's bridge photography. The search product covers Taraz, matching the illustration.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#FBFBFA` |
| Quiet panel | `#F3F4F3` |
| Primary text | `#202625` |
| Secondary text | `#67716E` |
| Primary accent | `#A9D6E5` |
| Accent hover | `#95C9DB` |
| Text on accent | `#244B59` |
| Hairline border | `#E0E5E2` |
| Illustration blue panel | `#DEEDF1` |
| Illustration sand panel | `#EAE7DF` |

## Typography and layout

- Typeface: locally hosted Haffer; Regular (400) for headlines and body, Medium (500) for controls, and Semibold (600) for the brand and selected emphasis. Arial / Helvetica / sans-serif provide fallback glyphs, including the tenge symbol, which is absent from these supplied Haffer files.
- Hero: 38–64 px, 1.12 line height, approximately -0.045 em tracking.
- Section heading: 30–41 px, 1.18 line height; feature heading: 31–37 px.
- Main body: 16–19 px, 1.55–1.7 line height. Product previews intentionally use smaller UI text.
- Main container: maximum 1240 px; page gutters: 48 px desktop, 32 px tablet, 20 px mobile.
- Section rhythm: about 90–120 px desktop, 57–70 px mobile.
- Corners: 7 px buttons; 8–10 px small cards and hero; 16–20 px large feature panels.
- Shadows: restrained, reserved for product previews. Flat main page surfaces.
- Buttons: blue primary and outlined secondary; 48–50 px height, dark text, slim directional arrow.
- Breakpoints: 1100, 800, and 520 px. Paired panels stack, the mobile menu replaces desktop links, and plan cards become one column.

## Font assets and scope

The user supplied the Haffer family in the repository-root `fonts/` directory. `fonts.ts` loads three WOFF2 files using `next/font/local`; the font variable is attached to the landing-page wrapper and the dashboard layout, each with its own scoped styling. No Google Fonts request is needed for Haffer. The existing application-wide Plus Jakarta Sans configuration is untouched.

Regular, Medium, and Semibold were losslessly packaged as WOFF2 from the supplied OTF files, preserving their character maps. Each contains all 66 uppercase/lowercase Russian letters, including Ё/ё. The family is selected after checking the official Sora and Outfit distributions, which contain Latin but not Cyrillic.

The supplied files are named `TRIAL`, and the accompanying `Befonts-License.txt` states “Personal Use Only.” A copy is retained with the web assets. These files are used for the local design preview; replace them with licensed webfonts before commercial publication.

## Components and behavior

Sticky navigation, left-aligned hero, Taraz illustration, business categories, alternating feature panels, interactive example map, score breakdown, three-step guide, existing Basic/Premium pricing, native disclosure FAQs, closing CTA, and compact footer.

The business selector updates illustrative location names and scores; it is labelled as a demo. Primary actions use the existing `/auth` entry point. Section navigation uses real anchors. FAQs use native `details`/`summary`. Mobile navigation exposes expanded state and supports Escape. A skip link and visible focus rings support keyboard navigation. Reduced-motion styling disables component transitions.

The original landing page contained Basic, Premium, and Enterprise plan copy. This version retains the existing free Basic and monthly 49,000 ₸ Premium pricing; it omits the broken contact, blog, and Enterprise sales links. No billing behavior is added.

## Artwork

- Generator: built-in image generation; illustrated interpretation of a real Taraz residential neighborhood.
- Reference: [Taraz, 12th microdistrict, Sergey Murzin](https://fototerra.ru/photo-page/Kazahstan/Taraz/267917).
- PNG: `frontend/public/images/taraz-neighborhood-2k.png`.
- Web asset: `frontend/public/images/taraz-neighborhood-2k.webp`.
- Final export: 2048 × 1152, resized with Lanczos3 from the 1672 × 941 generated output.
- Full-bleed everyday city panorama with residential buildings, trees, pedestrian paths and residents. Warm stone, terracotta and greens balance powder-blue accents. No single landmark, paper border or vignette.
- Used on the landing page and search questionnaire.

### Generation prompt

See `output/imagegen/taraz-neighborhood-prompt.txt` for the exact prompt.
