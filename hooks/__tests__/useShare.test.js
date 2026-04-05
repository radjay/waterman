/**
 * Tests for useShare hook.
 *
 * These tests require @testing-library/react and jest-environment-jsdom
 * to run. Add a test runner (e.g. jest or vitest) to package.json to
 * execute them.
 */
import { renderHook, act } from "@testing-library/react";
import { useShare } from "../useShare";

describe("useShare", () => {
  afterEach(() => {
    delete navigator.share;
    delete navigator.clipboard;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("initial state", () => {
    it("returns isSharing=false and copied=false initially", () => {
      const { result } = renderHook(() => useShare({ url: "https://example.com" }));
      expect(result.current.isSharing).toBe(false);
      expect(result.current.copied).toBe(false);
    });
  });

  describe("Web Share API path", () => {
    it("calls navigator.share with the provided url", async () => {
      const shareMock = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      const { result } = renderHook(() =>
        useShare({ url: "https://waterman.app/report/guincho", title: "Guincho" })
      );

      await act(async () => {
        await result.current.share();
      });

      expect(shareMock).toHaveBeenCalledWith({
        url: "https://waterman.app/report/guincho",
        title: "Guincho",
      });
    });

    it("treats AbortError as a silent no-op (user dismissed sheet)", async () => {
      const abortError = new DOMException("Share canceled", "AbortError");
      Object.defineProperty(navigator, "share", {
        value: jest.fn().mockRejectedValue(abortError),
        configurable: true,
      });

      const { result } = renderHook(() => useShare({ url: "https://example.com" }));

      await act(async () => {
        await result.current.share();
      });

      // No throw, no copied state
      expect(result.current.copied).toBe(false);
      expect(result.current.isSharing).toBe(false);
    });

    it("does not set copied=true when Web Share API succeeds", async () => {
      Object.defineProperty(navigator, "share", {
        value: jest.fn().mockResolvedValue(undefined),
        configurable: true,
      });

      const { result } = renderHook(() => useShare({ url: "https://example.com" }));

      await act(async () => {
        await result.current.share();
      });

      expect(result.current.copied).toBe(false);
    });
  });

  describe("clipboard fallback path", () => {
    it("copies url to clipboard when navigator.share is unavailable", async () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const { result } = renderHook(() =>
        useShare({ url: "https://waterman.app/report/carcavelos" })
      );

      await act(async () => {
        await result.current.share();
      });

      expect(writeTextMock).toHaveBeenCalledWith("https://waterman.app/report/carcavelos");
    });

    it("sets copied=true for 2 seconds after clipboard write", async () => {
      jest.useFakeTimers();
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: jest.fn().mockResolvedValue(undefined) },
        configurable: true,
      });

      const { result } = renderHook(() => useShare({ url: "https://example.com" }));

      await act(async () => {
        await result.current.share();
      });

      expect(result.current.copied).toBe(true);

      act(() => jest.advanceTimersByTime(2000));
      expect(result.current.copied).toBe(false);
    });

    it("silently ignores clipboard write failure", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: jest.fn().mockRejectedValue(new Error("Permission denied")) },
        configurable: true,
      });

      const { result } = renderHook(() => useShare({ url: "https://example.com" }));

      await act(async () => {
        await result.current.share();
      });

      expect(result.current.copied).toBe(false);
      expect(result.current.isSharing).toBe(false);
    });
  });

  describe("concurrent share guard", () => {
    it("ignores a second call while the first is in flight", async () => {
      let resolve;
      const shareMock = jest.fn(
        () => new Promise((r) => { resolve = r; })
      );
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      const { result } = renderHook(() => useShare({ url: "https://example.com" }));

      // Fire first share (in flight)
      act(() => { result.current.share(); });

      // Fire second share — should be ignored
      await act(async () => {
        await result.current.share();
      });

      expect(shareMock).toHaveBeenCalledTimes(1);

      // Resolve the first
      await act(async () => { resolve(); });
    });
  });
});
