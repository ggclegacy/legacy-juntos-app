# Apollo luminous presence

## Direction

Apollo’s signature should be an illuminated, breathing intelligence core: clear champagne-gold highlights, saturated Brazilian green, and fluid layered light over a deep transparent-looking body. The surrounding environment should carry reflected color into the header, scope selector, conversation, and dock. Black remains a depth cue rather than the entire visual experience.

The initial material had insufficient luminance and too much fine surface noise. Increasing the same noise would produce a brighter textured ball without solving its character. The revised material instead uses broad flowing folds, narrow light filaments, a reflective highlight, an orbital arc, and a luminous rim. Gold and green occupy spatially distinct regions so their mixture does not become an olive-brown wash. These are art-direction judgments specific to Apollo.

## Research and implementation decisions

### Material and illumination

Three.js documents clearcoat, transmission, and other physical material features, while noting that their complexity increases per-pixel cost. A complete physically based scene is useful when realistic interactions between geometry, lights, and environment maps are needed. Apollo has one abstract hero and does not need physically accurate refraction through other scene objects. Its custom shader can evoke a translucent luminous surface without importing a large scene pipeline. This is an aesthetic approximation, not physical volumetric rendering. [1]

The Book of Shaders describes accumulating noise at different scales and using noise to transform a coordinate domain. That provides a useful foundation for flowing forms. Here the visual problem calls for lower-frequency deformation rather than many octaves of detail. The new shader uses smooth, nested sinusoidal flow fields to bend broad bands and narrow filaments over reconstructed sphere normals. This avoids the previous speckled mineral appearance. [2]

The new palette keeps bright champagne in highlights, warm saturated gold in flowing bands, and clear green on the opposite side. An exponential highlight curve compresses bright values without washing the entire object white. A transparent canvas allows local shader glow to blend into the page’s green/gold illumination rather than exposing a black rectangle.

### Life and motion

A living presence must visibly change within a few seconds of observation. The revised idle timebase drives an approximately six-second breathing cycle, modulating radius and illumination together. The surface flows continuously, orbital particles move, and the surrounding light field expands softly. These are ambient presentation behaviors, not claims that a microphone is recording or that a model is thinking.

Motion’s performance guide distinguishes layout, paint, and composition. It recommends transform and opacity as broadly efficient animation properties and cautions that animating layout can create cascading work. Accordingly, the atmosphere moves through transform/opacity; breathing geometry and surface flow stay on the GPU; text entry does not trigger layout animations. The renderer consumes transient values through a ref rather than updating React state every frame. [3]

Typing increases the orb’s energy slightly, creating an immediate connection between composer and presence. Sending continues to use real request state. Input and output audio levels and spectral bands remain separate transport inputs; voice states must be driven by a connected service. The orb never simulates listening merely because someone opens Apollo.

### Performance and fallbacks

MDN’s WebGL guidance supports batching, bounded buffers, avoiding blocking queries in render loops, and explicit cleanup. The revision retains one draw call, a capped backing buffer, a 60fps rendering target, background/offscreen skipping, cleanup, and context-loss recovery. It removes the four-octave noise evaluation from each pixel in favor of a small fixed flow expression. A stronger appearance does not require a larger rendering budget. [4]

The CSS fallback now uses the same brighter gold/green material language and a breathing transform. Its opacity drops only when WebGL has initialized, avoiding a dark or empty hero during startup. Reduced-motion preference stops geometric motion, and the pause control stops the hero atmosphere and fallback animation along with the shader. Actual device thermal behavior still needs physical phone profiling.

### Conversation quality

The composer is treated as the second focal point after the orb. Its green-black surface, gold focus border, larger readable draft text, and warm gold send control create a clear visual path. Consent and send/voice actions immediately follow the input. Memory awareness, selected entries, and teaching controls follow those actions rather than interrupting the input-to-send sequence.

The private/shared controls keep their existing behavior and authorization boundaries. Suggested prompts remain editable drafts. Existing memory, knowledge, saved conversation, and reviewed-save functions are preserved. The Voice control continues to disclose that realtime voice has not yet been connected.

## Acceptance criteria

1. The sphere has visible gold and green areas at ordinary screen brightness, with broad fluid light instead of fine brown-green texture.
2. Idle screenshots taken at different points in the breathing cycle differ materially; pausing produces a stable hero image.
3. The page carries illuminated green and gold beyond the sphere while keeping readable contrast.
4. Typing, scope switching, sending, knowledge, memory, keyboard dismissal, and browser navigation keep working.
5. Reduced motion and unavailable/lost WebGL retain the same visual identity and usable conversation.
6. Phone and desktop captures are inspected, and the affected browser journeys, lint, type checks, and production build pass.

## Sources

1. Three.js, [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html), retrieved September 14, 2026.
2. Patricio Gonzalez Vivo and Jen Lowe, [The Book of Shaders: Fractal Brownian Motion](https://thebookofshaders.com/13/), retrieved September 14, 2026.
3. Motion, [Animation performance guide](https://motion.dev/docs/performance), retrieved September 14, 2026.
4. MDN, [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), retrieved September 14, 2026.

ElevenLabs’ official orb documentation was also located as a comparison for audio-reactive orb APIs, but direct retrieval was restricted. No source-code or visual claims here depend on that inaccessible page.
