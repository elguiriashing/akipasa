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
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  return {
    x: clamp((dx * Math.cos(a) + dy * Math.sin(a)) / 28),
    y: clamp((dy * Math.cos(a) - dx * Math.sin(a)) / 28),
  };
}
export function foilProperties(x: number, y: number) {
  const reveal = Math.pow(
    Math.max(0, 1 - Math.abs(x * 0.8 + y * 0.6 - 0.35) / 0.42),
    2,
  );
  return {
    "--rx": `${-y * 3}deg`,
    "--ry": `${x * 4}deg`,
    "--mx": `${50 + x * 47}%`,
    "--my": `${50 + y * 47}%`,
    "--fx": `${50 - x * 48}%`,
    "--fy": `${50 - y * 48}%`,
    "--reveal": String(reveal),
  };
}
