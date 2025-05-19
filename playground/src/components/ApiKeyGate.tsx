import { useState, useEffect, ReactNode } from "react";
import { useConvex } from "convex/react";
import type { PlaygroundAPI } from "../definePlaygroundAPI";
import { anyApi } from "convex/server";

const API_KEY_STORAGE_KEY = "playground_api_key";
const API_PATH_STORAGE_KEY = "playground_api_path";
const CLI_COMMAND = `npx convex run --component agent apiKeys:issue '{name: "..."}'`;
const PLAYGROUND_CODE = `
import { definePlaygroundAPI } from "@convex-dev/agent/playground";
import { components } from "./_generated/api";
import { weatherAgent, fashionAgent } from "./example";

export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, { agents: [weatherAgent, fashionAgent] });
`;
function ApiKeyGate({
  children,
}: {
  children: (apiKey: string, api: PlaygroundAPI) => ReactNode;
}) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [apiPath, setApiPath] = useState<string>("playground");
  const [apiPathInput, setApiPathInput] = useState("playground");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const convex = useConvex();

  useEffect(() => {
    const storedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) setApiKey(storedKey);
    const storedPath = sessionStorage.getItem(API_PATH_STORAGE_KEY);
    if (storedPath) {
      setApiPath(storedPath);
      setApiPathInput(storedPath);
    }
  }, []);

  // Construct the API object using the playground path
  const api: PlaygroundAPI = apiPath
    .trim()
    .split("/")
    .reduce((acc, part) => acc[part], anyApi) as unknown as PlaygroundAPI;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Construct API object from input
    const nextApi = apiPathInput
      .trim()
      .split("/")
      .reduce((acc, part) => acc[part], anyApi) as unknown as PlaygroundAPI;
    try {
      const isValid = await convex.query(nextApi.isApiKeyValid, {
        apiKey: inputValue,
      });
      if (!isValid) {
        setError("Invalid API key for this playground path.");
        setLoading(false);
        return;
      }
      // Save and proceed
      sessionStorage.setItem(API_KEY_STORAGE_KEY, inputValue);
      sessionStorage.setItem(API_PATH_STORAGE_KEY, apiPathInput);
      setApiKey(inputValue);
      setApiPath(apiPathInput);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(
        "Invalid playground path (could not find isApiKeyValid). Please check the path and try again." +
          "e.g. if you exported the API in convex/foo/playground.ts, it would be foo/playground." +
          " The code there should be:\n" +
          PLAYGROUND_CODE
      );
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(CLI_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (!apiKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-2xl p-8 flex flex-col gap-6 min-w-[400px] max-w-[90vw] border border-muted"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold mb-1 text-foreground">
              Configure the playground
            </h2>
            <div>
              Your target backend deployment: {import.meta.env.VITE_CONVEX_URL}
            </div>
            <h3 className="text-xl font-bold mb-1 text-foreground">API Path</h3>
            <label className="text-sm font-medium text-foreground">
              Playground API Path
            </label>
            <input
              className="border border-input rounded-lg px-4 py-2 text-base font-mono bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full min-w-0"
              type="text"
              value={apiPathInput}
              onChange={(e) => setApiPathInput(e.target.value.trim())}
              placeholder="playground"
              disabled={loading}
            />
            <span className="text-xs text-muted-foreground">
              Usually <code>playground</code>, or the path to your Convex
              playground module.
            </span>
          </div>
          <h3 className="text-xl font-bold mb-1 text-foreground">API Key</h3>
          <div className="text-muted-foreground text-sm mb-2">
            To use the Playground, you need an API key. After setting up the
            agent in your app, run this command in your project directory (CLI
            or Convex dashboard):
            <div className="relative my-3">
              <pre className="bg-gray-900 text-white rounded-md p-3 pr-14 text-xs overflow-x-auto border border-gray-800 font-mono select-all">
                {CLI_COMMAND}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white rounded px-2 py-1 text-xs flex items-center gap-1 shadow"
                tabIndex={-1}
                aria-label="Copy command"
              >
                {copied ? (
                  <span>Copied!</span>
                ) : (
                  <>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        fill="#fff"
                        fillOpacity="0.1"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                      <rect
                        x="3"
                        y="3"
                        width="13"
                        height="13"
                        rx="2"
                        fill="#fff"
                        fillOpacity="0.2"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <span className="block mt-2">
              Paste the resulting API key below.
            </span>
          </div>
          <input
            className="border border-input rounded-lg px-4 py-3 text-base font-mono bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full min-w-0"
            type="text"
            value={inputValue}
            onChange={(e) =>
              setInputValue(
                e.target.value
                  .trim()
                  .replace(/^['"]|['"]$/g, "")
                  .trim()
              )
            }
            placeholder="API Key"
            autoFocus
            disabled={loading}
          />
          {error && (
            // we want to show the error in a code block
            <div className="text-red-600 text-sm  font-medium mt-2">
              <pre className="bg-gray-900 text-white rounded-md p-3 pr-14 text-xs overflow-x-auto border border-gray-800 font-mono select-all">
                {error}
              </pre>
            </div>
          )}
          <button
            type="submit"
            className={`bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 transition mt-2 shadow ${
              loading || !inputValue.length ? "opacity-50" : ""
            }`}
            disabled={loading || !inputValue.length}
          >
            {loading ? "Validating..." : "Save"}
          </button>
        </form>
      </div>
    );
  }

  // Valid
  return children(apiKey, api);
}

export default ApiKeyGate;
