import { foilProperties } from "./passport-holo";

type Point = { x: number; y: number };

// Demand-driven interpolation: a still passport must not write styles every frame.
export function animatePassportFoil(
  surface: () => { style: Pick<CSSStyleDeclaration, "setProperty"> } | null,
  target: () => Point,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
) {
  let frame = 0;
  let last = 0;
  let x = 0;
  let y = 0;
  let stopped = false;
  const render = (now: number) => {
    frame = 0;
    const element = surface();
    if (stopped || !element) return;
    const next = target();
    const t = 1 - Math.exp(-Math.min(last ? now - last : 16, 64) / 85);
    x += (next.x - x) * t;
    y += (next.y - y) * t;
    const settled = Math.abs(next.x - x) + Math.abs(next.y - y) < 0.001;
    if (settled) {
      x = next.x;
      y = next.y;
    }
    for (const [key, value] of Object.entries(foilProperties(x, y)))
      element.style.setProperty(key, value);
    last = now;
    if (!settled) frame = requestFrame(render);
  };
  return {
    wake() {
      if (stopped || frame) return;
      last = 0;
      frame = requestFrame(render);
    },
    pause() {
      cancelFrame(frame);
      frame = 0;
    },
    stop() {
      stopped = true;
      cancelFrame(frame);
      frame = 0;
    },
  };
}
