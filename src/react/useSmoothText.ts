import { useEffect, useRef, useState } from "react";
/**
 * A hook that smoothly displays text as it is streamed.
 *
 * @param text The text to display. Pass in the full text each time.
 * @param charsPerSec The number of characters to display per second.
 * @returns A tuple of the visible text and the state of the smooth text,
 * including the current cursor position and whether it's still streaming.
 * This allows you to decide if it's too far behind and you want to adjust
 * the charsPerSec or just prefer the full text.
 */
export function useSmoothText(
  text: string,
  {
    charsPerSec = 512,
  }: {
    /**
     * The number of characters to display per second.
     */
    charsPerSec?: number;
  } = {}
): [string, { cursor: number; isStreaming: boolean }] {
  const [visibleText, setVisibleText] = useState(text);
  const smoothState = useRef({
    lastUpdated: Date.now() + (text.length * 1000) / charsPerSec,
    cursor: text.length,
  });

  const isStreaming = smoothState.current.cursor < text.length;

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    function update() {
      if (smoothState.current.cursor >= text.length) {
        return;
      }
      const now = Date.now();
      const timeSinceLastUpdate = now - smoothState.current.lastUpdated;
      const chars = Math.floor((timeSinceLastUpdate * charsPerSec) / 1000);
      smoothState.current.cursor = Math.min(
        smoothState.current.cursor + chars,
        text.length
      );
      smoothState.current.lastUpdated = now;
      setVisibleText(text.slice(0, smoothState.current.cursor));
    }
    update();
    const interval = setInterval(() => {
      update();
    }, 50);
    return () => clearInterval(interval);
  }, [text, isStreaming, charsPerSec]);

  return [visibleText, { cursor: smoothState.current.cursor, isStreaming }];
}
