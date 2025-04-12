import { useState, useMemo } from "react";

if (typeof window === "undefined") {
  throw new Error("this is frontend code, but it's running somewhere else!");
}

export function useStreamingText(
  url: string,
  threadId: string | null,
  token?: string
) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const readStream = useMemo(
    () => async (prompt: string) => {
      if (!threadId) return;
      try {
        setText("");
        setLoading(true);
        setError(null);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt, threadId }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No body");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          accumulatedText += decoder.decode(value);
          setText(accumulatedText);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(e);
        }
      } finally {
        setLoading(false);
      }
    },
    [threadId, token]
  );
  return [{ text, loading, error }, readStream] as const;
}
