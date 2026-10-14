import { describe, expect, it, vi } from "vitest";
import { animatePassportFoil } from "../src/lib/passport-animation";

function harness() {
  let target = { x: 0, y: 0 };
  let id = 0;
  let now = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const setProperty = vi.fn();
  const animator = animatePassportFoil(
    () => ({ style: { setProperty } }),
    () => target,
    (callback) => {
      frames.set(++id, callback);
      return id;
    },
    (frame) => frames.delete(frame),
  );
  return {
    animator,
    frames,
    setProperty,
    move(next: typeof target) {
      target = next;
      animator.wake();
    },
    tick() {
      now += 16;
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach((callback) => callback(now));
    },
  };
}

describe("passport foil scheduling", () => {
  it("stays idle after settling and wakes again for a changed target", () => {
    const h = harness();
    h.animator.wake();
    h.animator.wake();
    expect(h.frames.size).toBe(1);
    h.tick();
    expect(h.frames.size).toBe(0);
    h.animator.wake();
    expect(h.frames.size).toBe(0);
    const writes = h.setProperty.mock.calls.length;
    h.tick();
    expect(h.setProperty).toHaveBeenCalledTimes(writes);
    h.move({ x: 0.8, y: -0.6 });
    for (let i = 0; i < 100 && h.frames.size; i++) h.tick();
    expect(h.frames.size).toBe(0);
    h.move({ x: 0.8, y: -0.6 });
    expect(h.frames.size).toBe(0);
    expect(
      h.setProperty.mock.calls.filter(([key]) => key === "--mx").at(-1)?.[1],
    ).toBe("87.6%");
    h.move({ x: 0, y: 0 });
    for (let i = 0; i < 100 && h.frames.size; i++) h.tick();
    expect(h.frames.size).toBe(0);
    expect(
      h.setProperty.mock.calls.filter(([key]) => key === "--mx").at(-1)?.[1],
    ).toBe("50%");
  });

  it("cancels work when hidden, resumes, and never schedules after unmount", () => {
    const h = harness();
    h.move({ x: 1, y: 1 });
    h.animator.pause();
    expect(h.frames.size).toBe(0);
    h.animator.wake();
    h.tick();
    expect(h.frames.size).toBe(1);
    h.animator.stop();
    h.animator.wake();
    expect(h.frames.size).toBe(0);
  });
});
