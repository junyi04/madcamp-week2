import * as THREE from "three";

export type StarSpriteOptions = {
  size?: number;          // canvas resolution
  coreRadius?: number;    // 0..0.5 (relative to size)
  haloRadius?: number;    // 0..0.5
  coreAlpha?: number;     // 0..1
  haloAlpha?: number;     // 0..1
  spikes?: boolean;
};

// simple module-level cache so you don't regenerate
const cache = new Map<string, THREE.Texture>();

export function makeStarSpriteTexture(opts: StarSpriteOptions = {}) {
  const {
    size = 256,
    coreRadius = 0.12,
    haloRadius = 0.48,
    coreAlpha = 1.0,
    haloAlpha = 0.20,
  } = opts;

  const key = JSON.stringify({ size, coreRadius, haloRadius, coreAlpha, haloAlpha});
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Halo
  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * haloRadius);
    g.addColorStop(0.0, `rgba(255,255,255,${haloAlpha})`);
    g.addColorStop(0.25, `rgba(255,255,255,${haloAlpha * 0.6})`);
    g.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // Core
  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * coreRadius);
    g.addColorStop(0.0, `rgba(255,255,255,${coreAlpha})`);
    g.addColorStop(0.35, `rgba(255,255,255,${coreAlpha * 0.85})`);
    g.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  cache.set(key, tex);
  return tex;
}
