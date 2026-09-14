# Apollo navigation and presence

## Design decision

Apollo should be a recognizable place within Legacy Juntos: a quiet obsidian environment with warm gold and Brazilian green, centered on one living object. The conversation and its purpose remain more important than the animation. The recommended primary navigation is Home, Faith, Apollo, Juntos, and Ascend. These map to the existing home, faith, Apollo, connect, and performance experiences; they do not create parallel copies of app features.

This brief distinguishes documented platform behavior from product recommendations. The implementation choices below are design and engineering judgments for this repository, not claims that one visual treatment is universally best. The application uses Next.js 16, React 19, CSS design tokens, Supabase authorization, and a JSON-based Apollo endpoint. It already supports memory, knowledge, recall, preferences, saved conversations, and deliberate consent. Preserving these is a core requirement.

## Navigation and hierarchy

Apple describes tab bars as navigation between top-level sections and advises maintaining stable availability. Material’s navigation guidance places three to five top-level mobile destinations in bottom navigation. These sources support five recognizable destinations rather than compressing every domain into the dock. Neither source requires a raised center button: Apollo’s elevation is a bespoke brand choice. [1][2]

Keep visible labels even when an icon seems recognizable. Home restores the primary workspace; Juntos opens the existing connection area; Ascend opens performance. The full menu continues to expose nutrition, protocols, business, studio, memories, legacy, and the other deeper destinations. The center control opens Apollo’s full-screen environment without requesting microphone access or submitting a message.

The dock reserves layout clearance and incorporates the device’s bottom safe area. Apollo also contains its own dock within the modal’s focus boundary, so native dialog focus management does not make navigation inaccessible. URL fragments and browser history expose navigation state without a new server route or changes to authentication. Close returns to the underlying destination. Browser Back and Forward enter and leave Apollo consistently.

## What current voice interfaces teach

Gemini Live documents natural interruption by speaking, explicit hold/end controls, and optional text transcription. These behaviors establish a useful expectation: users can stop, resume, and understand a session instead of waiting for an animation to finish. Its documentation is evidence of product behavior, not evidence that copying its appearance improves usability. [3]

ChatGPT’s documented voice experience permits natural conversation and interruptions. Voice interfaces should retain usable text and explicit session controls, with visible microphone status. Apollo should borrow that clarity while retaining its own black, gold, and green identity. A voice icon by itself must never imply recording has started. [4]

ElevenLabs’ orb documentation describes a WebGL orb with audio reactivity and customizable appearance. It demonstrates that audio state and an orb renderer can be separate reusable components. The documentation page returned an access restriction during direct retrieval, so this comparison relies on its indexed official description, not a source-code audit. No component or visual asset has been copied from ElevenLabs. [5]

For Apollo, the opening view therefore contains a restrained identity line, orb, readable status, private/shared context, three suggested starting points, and a composer. Memory, research, preferences, and conversation controls remain one step away. Suggested prompts fill a draft; they never submit automatically or imply that unsupplied private information has been accessed.

## Rendering technology

Three.js is a strong choice when a scene needs several meshes, lighting, environment maps, cameras, and a broad postprocessing pipeline. Its responsive-rendering guidance explains the cost of high-density backing buffers: mobile display density can multiply the number of rendered pixels substantially. Matching device pixel ratio blindly is inappropriate for a continuously animated decorative object. [6]

Apollo’s current scene contains one hero object, procedural surface energy, and a few surrounding particles. A direct WebGL fragment shader is the cleaner implementation for this codebase: one canvas, one draw call, no added 3D dependency, no downloaded textures, no full-screen bloom pass. A sphere normal reconstructed from the visible hemisphere provides dimensional lighting and a Fresnel-like rim. Layered noise drives gold/green mineral filaments over a dark core. An analytic outer halo provides a bloom-like impression without claiming physically correct volumetric scattering.

The Book of Shaders explains fractal Brownian motion as summed noise at changing amplitudes and frequencies. That technique supplies organic structure rather than a visibly repetitive gradient. Apollo uses a small fixed number of octaves and a bounded particle loop. State changes alter speed, energy, green balance, and surface behavior while interpolation prevents abrupt visual jumps. [7]

MDN recommends considering smaller back buffers, batching draw calls, avoiding synchronous WebGL queries in production loops, and releasing GPU objects explicitly. The implementation caps canvas dimensions and display-density scaling, limits ordinary rendering to roughly 30 frames per second, skips invisible/background rendering, and releases buffers, shaders, and programs on unmount. Context loss removes the canvas presentation and reveals the fallback. Shader failure also retains the fallback. [8]

The fallback is an obsidian CSS sphere with metallic gold and green lighting. It is an intentional degraded rendering mode; it does not attempt to duplicate every shader detail. Chat, source controls, and navigation work independently of WebGL.

## State vocabulary

The visual states are product-specific recommendations. Their text labels are authoritative; hue and movement provide secondary cues.

| State | Visible meaning | Visual behavior |
|---|---|---|
| Idle | Here with you | Slow gold-led mineral drift; restrained green edge |
| Connecting | Connecting | More energy and faster flow while a real connection is pending |
| Listening | Listening to you | Green becomes stronger; microphone amplitude can shape energy |
| Thinking | Thinking it through | Concentrated gold flow with increased internal complexity |
| Responding | Responding | More luminous outward energy as text arrives |
| Speaking | Apollo is speaking | Output audio level and spectral features drive the surface |
| Interrupted | Paused · your turn | Motion and intensity settle immediately |
| Error | Something needs attention | Subdued gold with explicit error text and recovery options |
| Offline | You’re offline | Almost still, low intensity; typed draft remains usable |

Connecting and speaking must come from transport/playback events. A timer is not evidence that a connection exists, a microphone is active, or speech is playing. The current Apollo endpoint returns complete JSON responses; it drives thinking, completion, cancellation, and errors. Streaming and voice states are supported by the session contract for a future transport and are not artificially played during a text request.

## Voice and audio architecture

OpenAI’s realtime documentation distinguishes generation from playback. On interruption, WebRTC/SIP can manage the output buffer and truncate unheard audio; a WebSocket client must stop playback and track where truncation should occur. Merely cancelling text generation does not implement correct barge-in. The transport contract therefore explicitly assigns playback stop, provider cancellation, and unheard-audio truncation to the adapter. [9]

The optional voice hook connects only on an explicit action, subscribes to state and text events, samples input/output audio, supports mute, interruption, end, and reconnect, and discards callbacks from previous connection generations. Scope changes tear down the prior transport. The future adapter must obtain server-authorized short-lived credentials, obey existing consent and source restrictions, and clean up media tracks and audio nodes. No credential belongs in a client environment variable.

MDN’s Web Audio documentation describes `AnalyserNode` as a way to obtain time-domain and frequency-domain data. The provided sampler maintains reusable arrays, calculates input/output RMS levels, and extracts bass/treble energy. Sampling must not open a microphone or route its signal to speakers. A real voice adapter supplies the nodes, handles echo cancellation and browser permission, and reports actual speech activity separately from acoustic amplitude. [10]

A future realtime provider will also require appropriate connect/media CSP allowances and server session issuance. Existing security policy is not widened speculatively. The current Voice control clearly explains that voice is not connected and that no recording occurs.

## Privacy and shared context

The UI displays the authenticated member’s name and a private label, or Juntos with shared sources. It does not expose a Neil/Kamilla identity switch that could be mistaken for permission to access another person’s information. The existing authenticated request and database checks remain authoritative. The experience passes the authenticated user header and existing context/source selections to the existing API.

Changing context resets draft text, response, selected records, saved conversation, recall configuration, and consent. Shared context restricts selectable records to shared material and preserves existing restrictions on personal training, nutrition, and protocols recall. Shared sources do not mean automatic publication of generated text; saving remains a separate reviewed action. No new automatic persistence is introduced.

Cancellation aborts the browser request and ignores any stale reply. It cannot guarantee that a provider stopped processing or that an already-committed saved turn was removed. The interface explains this uncertainty and instructs the user to reopen a saved conversation before retrying. A future streaming endpoint should provide explicit cancellation and revision reconciliation.

## Accessibility and mobile behavior

WCAG 2.2’s target-size minimum is 24 by 24 CSS pixels, subject to specified spacing and other exceptions. The dock uses larger targets, with 44-pixel minimum control dimensions where practical. Active destinations use labels and current-page semantics. Focus rings use the existing contrast-tested gold token; status is readable text rather than a color-only signal. [11]

WCAG also covers animation from interactions and focus not being obscured. Apollo honors reduced-motion preference and includes a pause-motion control. Native dialog behavior provides a focus boundary and Escape dismissal. The underlying page cannot scroll while the world is open. A render fallback is distinct from a service failure: losing WebGL never disables the conversation. [12]

MDN notes that the on-screen keyboard can shrink the visual viewport without changing the layout viewport. Apollo listens to visual viewport height/offset, keeps the world bounded to that visible region, and reserves dock clearance. At short viewport heights while composing, the hero and prompt chips collapse. CSS safe-area insets protect the bottom controls. These techniques still require real iPhone/Android device checks; desktop emulation cannot establish physical keyboard, thermal, or haptic performance. [13][14]

## Production acceptance

Verify five destinations at phone and desktop widths, dominant Apollo placement, all existing memory/research entry points, context reset and consent, keyboard/Escape/Back/Forward, reduced motion, forced WebGL unavailability, offline behavior, and rendering context restoration. Use synthetic data for interaction tests and retain existing authorization/database tests. Check type safety, lint, and a production build before transferring the reviewed changes to the original project.

Haptic feedback should remain progressive enhancement. A native wrapper may attach an opt-in haptic callback to destination changes and explicit session controls. Web vibration support is not equivalent to iOS haptics and is not a reason to add unsolicited buzzing. Physical device performance, voice latency, echo cancellation, and real provider interruption are release checks once their integrations exist.

## Sources

1. Apple, [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), current documentation; retrieved September 14, 2026.
2. Google Material Design, [Understanding navigation](https://m2.material.io/design/navigation/understanding-navigation.html), earlier official guidance used specifically for destination count; [current M3 navigation guidelines](https://m3.material.io/components/navigation-bar/guidelines) are JavaScript-rendered.
3. Google, [Talk naturally with Gemini Live](https://support.google.com/gemini/answer/15274899?co=GENIE.Platform%3DAndroid&hl=en-CA), retrieved September 14, 2026.
4. OpenAI, [ChatGPT Voice](https://help.openai.com/en/articles/20001274), retrieved September 14, 2026.
5. ElevenLabs, [Orb](https://ui.elevenlabs.io/docs/components/orb), indexed official description; direct retrieval restricted.
6. Three.js, [Responsive design](https://threejs.org/manual/en/responsive.html), indexed official documentation.
7. Patricio Gonzalez Vivo and Jen Lowe, [The Book of Shaders: Fractal Brownian Motion](https://thebookofshaders.com/13/).
8. MDN, [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
9. OpenAI, [Realtime conversations: Interruption and Truncation](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation).
10. MDN, [Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API).
11. W3C, [Understanding SC 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).
12. W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/).
13. MDN, [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
14. MDN, [CSS env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env).
