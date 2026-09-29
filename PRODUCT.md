# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Curious general public.** Someone asking "is it worth going out in the midday sun for vitamin D where I live, this month?" Casual, often on a phone, usually arriving with a place in mind (home, a holiday destination) or via a shared link.
- **Health-aware individuals.** People thinking about their own vitamin D, especially those with darker skin, at high latitudes, or heading into winter, who want to know in which months sunlight is realistically enough and when they might consider supplementing.

## Product Purpose

SunnyD estimates how many minutes of midday sun a person needs to synthesise a target daily amount of vitamin D (D3, ~1,000 IU), for any location, month, Fitzpatrick skin type and amount of exposed skin. It exists to make the seasonal and geographic realities of sun-derived vitamin D visible and personal. Success is when a visitor leaves understanding their own number for their place and season, and roughly which months sunlight won't cover them.

## Positioning

- **The whole globe, every month.** A world map of required minutes with a month control shows geography and seasonality at once, where a UV-index app gives one number for one place today. A point also gets its full 12-month curve.
- **Personalised by skin and clothing.** Fitzpatrick skin type and exposure (winter clothing, T-shirt and shorts, swimsuit, or weather-adjusted coverage derived from local temperature) change the answer substantially, and the product makes that visible.
- **Free, static, private.** No accounts, no backend, no tracking. Everything is computed in the browser from pre-processed climate grids. The code is open source (AGPL-3.0).

## Operating Context

- The map is the main surface: pan and zoom to explore, click or tap a point for an estimate with its 12-month chart, search for a place (Photon geocoder), or use geolocation.
- A control panel sets month, skin type, exposure preset and colourblind mode. On mobile it becomes a slide-over drawer.
- The selected point and map viewport can be shared as a link, so visitors often arrive via a shared link.
- An About modal explains the model, variables, formulas and data sources for anyone who wants to check the maths.
- Grid data loads per month (~1–2 MB each) with a visible loading progress indicator.

## Capabilities and Constraints

- **Fully static; this must be preserved.** No runtime server. Deployable to any static host (Cloudflare Pages, Netlify, Vercel). All tile rendering and point estimates happen client-side from binary grids in `public/data/`.
- Stack: React 19, Vite, Tailwind CSS v4, MapLibre GL. Vitest and Testing Library for tests.
- Model: `t = (K × M_fitz) / (H_D × f_exposed)` with K ≈ 20.2. Where UV is insufficient the result is infinite ("not achievable"). Supplement guidance flags months that need more than 120 minutes.
- Exposure presets: Weather Adjusted (auto, 5–25% coverage from ERA5 temperature), Winter Clothing (5%), T-shirt + shorts (25%), Swimsuit (85%).
- Terminology in use: "minutes of midday sun", "skin type" (Fitzpatrick I–VI), "exposure", "Weather Adjusted", "model version".
- Map rotation and tilt are deliberately disabled, and so is the compass.

## Brand Commitments

- **Name:** "SunnyD", with the tagline in use: "How long in the sun for your daily Vitamin D?" Longer descriptor: "Global Vitamin D Sun Exposure Estimator".
- **Icon:** the sun-with-face emoji (`public/sun-with-face_playstation.png`) is part of the identity and stays.

## Evidence on Hand

- Data sources: TEMIS (KNMI) vitamin-D-weighted UV dose clear-sky climatology v2.0 (2004–2020), and ERA5 monthly 2 m temperature reanalysis (2016–2025), both cited with DOIs in the README and About modal.
- Published model derivation and constants (README, `src/api/methodology.ts`).
- Existing product screenshot: `public/screenshot.jpg`.
- Existing educational framing: "This is an educational model. It is not medical advice. It does not diagnose vitamin D deficiency." (README, About modal, in-panel disclaimer).
- The creator is reachable by email and there is a GitHub repo (MattNotarangelo/SunnyD).
- **Absent:** no user counts, testimonials, press, clinical validation or endorsements. Do not fabricate any.

## Product Principles

1. **Show the pattern, then the personal number.** The global and seasonal picture is the hook. The visitor's own place, skin and month is the payoff.
2. **Every input should visibly matter.** Skin type, exposure and month exist because they change the answer, so the change should be obvious.
3. **Honest about limits.** Say plainly when sun can't do the job ("not achievable", supplement months). Keep the model and sources one step away for anyone who wants to check.
4. **Light, fast, private.** Stay static and client-side, and ask for nothing (no accounts, no personal data).

## Accessibility & Inclusion

- A colourblind mode for the map colour scale is a first-class feature, not an extra.
- Mobile is a primary context, not a fallback: the map, controls, tooltip and chart must all work well at phone widths with touch.
- Skin type covers the full Fitzpatrick I–VI range. Darker skin types are a core audience, because they need much longer exposure.
