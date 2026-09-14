# Legacy Juntos sanctuary color system

## Direction and research

Obsidian is the application architecture; emerald marks identity and immersive moments; gold marks actions, selection, rewards and precision; ivory carries reading text. Ratios are directional, not pixel quotas. Existing routes, layouts, artwork, data and privacy behavior are preserved.

The short research pass informed these decisions:

- [Material tonal surface roles](https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md): use distinguishable surface tones to express elevation instead of tinting every layer green.
- [Google dark-theme guidance](https://codelabs.developers.google.com/codelabs/design-material-darktheme): elevated dark surfaces become lighter; avoid one flat black.
- [WCAG text contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html): validate 4.5:1 for normal text. [Non-text contrast](https://www.w3.org/WAI/WCAG21/understanding/non-text-contrast.html): validate 3:1 for meaningful control boundaries and focus indicators.
- [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [WebKit reduced motion](https://webkit.org/blog/7551/responsive-design-for-motion/): motion should communicate feedback and respect system preferences.
- [Rolex green ombré and precious-metal presentation](https://www.rolex.com/watches/new-watches/datejust-41): visual inspiration for containing rich green and metal in deliberate focal moments. This is an aesthetic inference, not evidence of an engagement or accessibility benefit.

## Source of truth

`src/app/tokens.css` is imported before the shared styles. All component CSS color literals have been replaced with semantic tokens. Existing aliases (`--gold`, `--glass`, domain gold tokens) resolve to this palette, rather than forming separate themes. Browser/PWA metadata matches the obsidian base.

| Role | Value | Use |
| --- | --- | --- |
| Base | #080A09 | App canvas, navigation architecture |
| Surface 1 | #0D100E | Recessed fields, reading, overlay headers |
| Surface 2 | #131713 | Working panels, cards, dialog body |
| Surface 3 | #1A1F1A | Elevated surfaces, hover, toast |
| Emerald deep / primary | #0B2920 / #124734 | Heroes, shared meaningful panels, Apollo |
| Gold muted / primary / bright | #B29459 / #D6B878 / #F1DCA7 | Metallic buttons, labels, icons, focus |
| Ivory / secondary / muted | #F0ECE2 / #BCB7AC / #A49F94 | Primary, secondary and placeholder text |

Gold edge, wash and glow are translucent decorative tokens; never use them as text or meaningful control outlines. Inputs use the stronger `border-control`; panels use quieter decorative edges. Primary gold buttons use `text-on-gold` at every gradient stop. Rich emerald surfaces support primary/secondary text and primary gold; muted text is intended for obsidian surfaces.

## Shared components and section identity

Navigation has an emerald selected surface, gold icon and marker, plus its existing `aria-current`. Tabs retain their pressed/current state and a gold selection treatment. Cards use restrained tonal elevation. Dialogs have an opaque obsidian body and darker header for predictable reading contrast. Inputs, placeholders, hover and keyboard focus share the same system.

Scripture is warm ivory on a recessed reading surface, with spacious line height and a gold edge/reference. Studio work surfaces are obsidian; existing media/art stays prominent. Performance uses gold completion and emerald progress. Nutrition keeps labeled gold/green/blue/ivory metric series. Protocol charts use semantic success and gold emphasis, while errors retain a separate warm-red treatment. No functionality or sharing consent flow is changed.

Gold light appears briefly on completion and status toasts; Apollo's busy emblem gives three restrained pulses then settles. Existing pointer reflection now uses gold, with no resting halo. Reduced motion disables animations and transitions globally; forced-color selection boundaries remain visible.

## Validation

`tests/theme.test.ts` guards text, focus, primary-gradient and chart contrast. Existing workflow tests cover responsive navigation, sharing/privacy, Apollo, training, protocols and nutrition. Visual captures cover all current navigation sections and Apollo at 1440px desktop and 390px mobile. See the implementation report for final run outcomes and limitations.

These styles cover the current application. A future full Bible reader, live publishing integration or voice-listening UI should consume these tokens and attach gold feedback to its real completion state; this refactor does not invent those features.

The Creative Studio implementation that arrived during the refactor is also integrated: Overview, Create, Campaigns, Calendar, Assets, Brands and Analytics consume the shared palette. Studio working/media surfaces are obsidian, Apollo panels retain emerald, and approved/published states pair their labels with semantic success color.

## Final verification — 2026-09-14

- Lint passed, including the final browser-test readiness fix.
- Production build passed on the actual Desktop checkout, including the new Apollo intelligence and Creative Studio routes.
- Unit/integration suite: 175 passed, 1 live-provider test skipped (19 files passed, 1 skipped). Run with one worker and a 120-second database setup allowance on this machine.
- All 40 distinct desktop/mobile browser scenarios passed across the final runs: 30 existing scenarios, 8 new Studio scenarios and 2 new Apollo recall/learning scenarios.
- The initial broad browser run was 27/30. Nutrition hit a development reload error; a mobile project test hit interference between test artifact directories. Both passed isolated reruns. The mobile workout test exposed an existing readiness race after reload; its helper now waits for the workspace controls before choosing mobile navigation. The same complete workout journey passed against the production build in 19.9 seconds.
- Visual audits covered every current main section, Apollo, and all seven Studio tabs at desktop and mobile sizes; no page errors or horizontal overflow were recorded.
- Token contrast tests pass for supported reading, gold-gradient, focus, chart and input-boundary pairs. Reduced-motion behavior passed browser checks.

Live generation/publishing and authenticated production content were not exercised without their required service credentials. No outstanding visual regressions were found in the audited sample workflows.
