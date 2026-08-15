'use client';

// ─── SolarMapBloom (Wave V4 — docs/VISUAL_DEPTH_2026-08.md §V4.3) ───────────
// The bloom post-processing pass for the 3D solar map, isolated in its own
// module so @react-three/postprocessing lands in a LAZY chunk that is only
// fetched when SolarMap3D's gates all pass (feature flag × FX toggle ×
// dpr>1 × !prefers-reduced-motion × desktop 3D renderer). Mobile and
// reduced-motion users never download this code.
//
// Selective by luminance, not by layer: the sun's toneMapped={false}
// material and the additive glow sprites are the only scene elements that
// exceed the threshold, so the sun + emissive pips bloom while the NASA
// body textures stay crisp (spec's "keep NASA textures the focus" bound).

import { EffectComposer, Bloom } from '@react-three/postprocessing';

export default function SolarMapBloom() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.55}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
    </EffectComposer>
  );
}
