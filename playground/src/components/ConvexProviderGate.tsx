import { useState, useEffect, ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const DEPLOYMENT_URL_STORAGE_KEY = "playground_deployment_url";
const DEPLOYMENT_URL_ENV = import.meta.env.VITE_CONVEX_URL as
  | string
  | undefined;

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function ConvexProviderGate({ children }: { children: ReactNode }) {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(
    DEPLOYMENT_URL_ENV
  );
  const [inputValue, setInputValue] = useState("");
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const convex = useMemo(
    () => deploymentUrl && new ConvexReactClient(deploymentUrl),
    [deploymentUrl]
  );

  // On mount, check sessionStorage and env
  useEffect(() => {
    if (deploymentUrl) return;
    const storedUrl = sessionStorage.getItem(DEPLOYMENT_URL_STORAGE_KEY);
    if (storedUrl) {
      setDeploymentUrl(storedUrl);
      setInputValue(storedUrl);
    } else if (DEPLOYMENT_URL_ENV) {
      setInputValue(DEPLOYMENT_URL_ENV);
    }
  }, []);

  // Debounced validation effect
  useEffect(() => {
    if (deploymentUrl) return;
    if (!inputValue) {
      setInstanceName(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (!isValidHttpUrl(inputValue)) {
      setInstanceName(null);
      setError(null);
      setLoading(false);
      setDeploymentUrl(null);
      sessionStorage.removeItem(DEPLOYMENT_URL_STORAGE_KEY);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handler = setTimeout(() => {
      const url = inputValue.trim().replace(/\/$/, "");
      fetch(url + "/instance_name")
        .then(async (res) => {
          if (cancelled) return;
          if (!res.ok) throw new Error("Invalid response");
          const name = await res.text();
          setInstanceName(name);
          setError(null);
          setLoading(false);
          setDeploymentUrl(url);
          sessionStorage.setItem(DEPLOYMENT_URL_STORAGE_KEY, url);
        })
        .catch(() => {
          if (cancelled) return;
          setInstanceName(null);
          setError(
            "Could not validate deployment URL. Please check the URL and try again."
          );
          setLoading(false);
          setDeploymentUrl(null);
          sessionStorage.removeItem(DEPLOYMENT_URL_STORAGE_KEY);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [inputValue, deploymentUrl]);

  if (!deploymentUrl) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <div
          className="bg-white rounded-xl shadow-2xl p-8 flex flex-col gap-6 border border-muted"
          style={{ minWidth: 750, maxWidth: "90vw", width: 750 }}
        >
          <h2 className="text-2xl font-bold mb-1 text-foreground">
            Configure Convex Deployment
          </h2>
          <label className="text-sm font-medium text-foreground">
            Deployment URL
          </label>
          <input
            className="border border-input rounded-lg px-4 py-2 text-base font-mono bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full min-w-0"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.trim())}
            placeholder="https://<your-convex>.cloud"
            autoFocus
          />
          <div style={{ minHeight: "2.5em" }} className="flex items-center">
            {loading ? (
              <div
                className="text-blue-700 text-sm font-medium break-words whitespace-pre-wrap bg-blue-50 rounded p-3 border border-blue-200"
                style={{ wordBreak: "break-word", maxWidth: "100%" }}
              >
                Validating...
              </div>
            ) : instanceName ? (
              <div className="text-green-700 text-sm">
                Instance: {instanceName}
              </div>
            ) : error ? (
              <div
                className="text-red-600 text-sm font-medium break-words whitespace-pre-wrap bg-red-50 rounded p-3 border border-red-200"
                style={{ wordBreak: "break-word", maxWidth: "100%" }}
              >
                {error}
              </div>
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export default ConvexProviderGate;
