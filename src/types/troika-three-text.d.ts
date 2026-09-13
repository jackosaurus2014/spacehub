// troika-three-text ships no types; drei wraps it, but the map configures
// its text builder directly (worker off — see map3d/shared.tsx).
declare module 'troika-three-text' {
  export function configureTextBuilder(config: { useWorker?: boolean; textureWidth?: number; sdfGlyphSize?: number; sdfMargin?: number; sdfExponent?: number }): void;
  export function preloadFont(options: { font?: string; characters?: string; sdfGlyphSize?: number }, callback?: () => void): void;
}
