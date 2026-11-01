// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { CheckInScanner } from "../src/components/CheckInScanner";
const token = "10000000-0000-4000-8000-000000000001";
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fakeStream() {
  const stop = vi.fn();
  return {
    stop,
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
  };
}
let frames: FrameRequestCallback[] = [];
const capture = vi.fn();
const decode = vi.fn();
beforeEach(() => {
  frames = [];
  capture.mockReset();
  decode.mockReset();
  push.mockReset();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: capture },
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  Object.defineProperty(window, "BarcodeDetector", {
    configurable: true,
    value: class {
      detect = decode;
    },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("does not initiate repeated capture while permission is pending", () => {
  const pending = deferred<MediaStream>();
  capture.mockReturnValue(pending.promise);
  render(<CheckInScanner locale="en" />);
  const start = screen.getByRole("button", { name: "Scan venue QR" });
  fireEvent.click(start);
  fireEvent.click(start);
  expect(capture).toHaveBeenCalledTimes(1);
});
it("never navigates from a decode that resolves after Stop", async () => {
  const stream = fakeStream();
  capture.mockResolvedValue(stream.stream);
  const pending = deferred<{ rawValue: string }[]>();
  decode.mockReturnValue(pending.promise);
  render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await screen.findByRole("button", { name: "Stop scanner" });
  await act(async () => {
    frames.shift()!(0);
  });
  fireEvent.click(screen.getByRole("button", { name: "Stop scanner" }));
  await act(async () =>
    pending.resolve([{ rawValue: `${location.origin}/en/check-in/${token}` }]),
  );
  expect(push).not.toHaveBeenCalled();
  expect(stream.stop).toHaveBeenCalledOnce();
});
it("ends live capture when the document becomes hidden", async () => {
  const stream = fakeStream();
  capture.mockResolvedValue(stream.stream);
  render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await screen.findByRole("button", { name: "Stop scanner" });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  fireEvent(document, new Event("visibilitychange"));
  expect(stream.stop).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Scan venue QR" })).toBeVisible();
});

it("cancels a pending permission request and ends its late stream without reviving UI", async () => {
  const pending = deferred<MediaStream>();
  const stream = fakeStream();
  capture.mockReturnValue(pending.promise);
  render(<CheckInScanner locale="es" />);
  fireEvent.click(
    screen.getByRole("button", { name: "Escanear QR del local" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancelar cámara" }));
  await act(async () => pending.resolve(stream.stream));
  expect(stream.stop).toHaveBeenCalledOnce();
  expect(push).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Escanear QR del local" }),
  ).toBeVisible();
  expect(capture).toHaveBeenCalledExactlyOnceWith({
    audio: false,
    video: { facingMode: { ideal: "environment" } },
  });
});
it("ends a permission stream arriving after unmount", async () => {
  const pending = deferred<MediaStream>();
  const stream = fakeStream();
  capture.mockReturnValue(pending.promise);
  const view = render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  view.unmount();
  await act(async () => pending.resolve(stream.stream));
  expect(stream.stop).toHaveBeenCalledOnce();
  expect(push).not.toHaveBeenCalled();
});
it("does not resume scanning after canceled playback resolves", async () => {
  const playback = deferred<void>();
  vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(playback.promise);
  const stream = fakeStream();
  capture.mockResolvedValue(stream.stream);
  render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await waitFor(() =>
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel camera" }));
  await act(async () => playback.resolve());
  expect(stream.stop).toHaveBeenCalledOnce();
  expect(frames).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Scan venue QR" })).toBeVisible();
});
it("ignores late old decode after a new scan starts without stopping the new stream", async () => {
  const first = fakeStream(),
    second = fakeStream(),
    oldDecode = deferred<{ rawValue: string }[]>();
  capture
    .mockResolvedValueOnce(first.stream)
    .mockResolvedValueOnce(second.stream);
  decode.mockReturnValue(oldDecode.promise);
  render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await screen.findByRole("button", { name: "Stop scanner" });
  await act(async () => {
    frames.shift()!(0);
  });
  fireEvent.click(screen.getByRole("button", { name: "Stop scanner" }));
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await screen.findByRole("button", { name: "Stop scanner" });
  await act(async () =>
    oldDecode.resolve([
      { rawValue: `${location.origin}/en/check-in/${token}` },
    ]),
  );
  expect(push).not.toHaveBeenCalled();
  expect(second.stop).not.toHaveBeenCalled();
  expect(first.stop).toHaveBeenCalledOnce();
});
it("retains valid official QR navigation and stops video before navigating", async () => {
  const stream = fakeStream();
  capture.mockResolvedValue(stream.stream);
  decode.mockResolvedValue([
    { rawValue: `${location.origin}/en/check-in/${token}` },
  ]);
  render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await screen.findByRole("button", { name: "Stop scanner" });
  await act(async () => {
    frames.shift()!(0);
  });
  expect(stream.stop).toHaveBeenCalledOnce();
  expect(push).toHaveBeenCalledExactlyOnceWith(`/en/check-in/${token}`);
  expect(stream.stop.mock.invocationCallOrder[0]).toBeLessThan(
    push.mock.invocationCallOrder[0],
  );
});
it("rejects foreign QR navigation while preserving a working camera", async () => {
  const stream = fakeStream();
  capture.mockResolvedValue(stream.stream);
  decode.mockResolvedValue([
    { rawValue: `https://example.invalid/en/check-in/${token}` },
  ]);
  render(<CheckInScanner locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Scan venue QR" }));
  await screen.findByRole("button", { name: "Stop scanner" });
  await act(async () => {
    frames.shift()!(0);
  });
  expect(push).not.toHaveBeenCalled();
  expect(stream.stop).not.toHaveBeenCalled();
});
