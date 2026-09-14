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

These styles cover the current application. A future full Bible reader, publishing pipeline, campaign approval flow or voice-listening UI should consume these tokens and attach gold feedback to its real completion state; this refactor does not invent those features.
