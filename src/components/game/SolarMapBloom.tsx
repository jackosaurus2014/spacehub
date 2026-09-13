'use client';

// ─── SolarMapBloom (Wave V4 — docs/VISUAL_DEPTH_2026-08.md §V4.3) ───────────
// The post-processing pass for the 3D solar map, isolated in its own module
// so @react-three/postprocessing lands in a LAZY chunk that is only fetched
// when SolarMap3D's gates all pass (feature flag × FX toggle × dpr>1 ×
// !prefers-reduced-motion × desktop 3D renderer). Mobile and reduced-motion
// users never download this code.
//
// Selective by luminance, not by layer: the sun's toneMapped={false}
// material and the additive glow sprites are the only scene elements that
// exceed the threshold, so the sun + emissive pips bloom while the NASA
// body textures stay crisp (spec's "keep NASA textures the focus" bound).
//
// Graphics review 2026-09-12 item 8: the same composer now also carries
// SMAA (edge anti-aliasing — the composer bypasses the canvas MSAA, so
// without it the FX path was visibly rougher than the plain path) and a
// soft Vignette that pulls the eye to the stage centre and deepens the
// corners. Both are static (no motion) and ride the same opt-in gate as
// bloom, so the default path is untouched.

import { EffectComposer, Bloom, SMAA, Vignette } from '@react-three/postprocessing';

export default function SolarMapBloom() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={0.55}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.28} darkness={0.55} />
    </EffectComposer>
  );
}
