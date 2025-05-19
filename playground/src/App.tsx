import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

const API_KEY_STORAGE_KEY = "playground_api_key";

const App = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sessionStorage.setItem(API_KEY_STORAGE_KEY, inputValue.trim());
      setApiKey(inputValue.trim());
    }
  };

  if (!apiKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-8 flex flex-col gap-4 min-w-[320px]"
        >
          <h2 className="text-lg font-bold mb-2">Enter Playground API Key</h2>
          <input
            className="border rounded px-3 py-2 text-base"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="API Key"
            autoFocus
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 transition"
          >
            Save
          </button>
        </form>
      </div>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index apiKey={apiKey} />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ConvexProvider>
  );
};

export default App;
