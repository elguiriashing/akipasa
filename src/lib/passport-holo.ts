/** The Holo Lab's normalized input, smoothing and optical reveal, adapted for pages. */
export function foilTarget(
  beta: number,
  gamma: number,
  origin: { beta: number; gamma: number },
  angle = 0,
) {
  const dx = ((gamma - origin.gamma + 540) % 360) - 180;
  const dy = ((beta - origin.beta + 540) % 360) - 180;
  const a = (angle * Math.PI) / 180;
  const sensitivity = 1.2 / 28;
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  return {
    x: clamp((dx * Math.cos(a) + dy * Math.sin(a)) * sensitivity),
    y: clamp((dy * Math.cos(a) - dx * Math.sin(a)) * sensitivity),
  };
}
export function foilProperties(x: number, y: number) {
  const reveal = Math.pow(
    Math.max(0, 1 - Math.abs(x * 0.8 + y * 0.6 - 0.35) / 0.42),
    2,
  );
  const depth = Math.min(1, Math.hypot(x, y));
  return {
    "--ghost-x": `${x * 10}px`,
    "--ghost-y": `${y * 10}px`,
    "--echo-x": `${-x * 6}px`,
    "--echo-y": `${-y * 6}px`,
    "--base-x": `${-x * 2}px`,
    "--base-y": `${-y * 2}px`,
    "--spectral-strength": String(0.1 + depth * 0.2),
    "--rx": `${-y * 3}deg`,
    "--ry": `${x * 4}deg`,
    "--mx": `${50 + x * 47}%`,
    "--my": `${50 + y * 47}%`,
    "--fx": `${50 - x * 48}%`,
    "--fy": `${50 - y * 48}%`,
    "--reveal": String(reveal),
  };
}
