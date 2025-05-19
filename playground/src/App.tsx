import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ApiKeyGate from "@/components/ApiKeyGate";
import ConvexProviderGate from "@/components/ConvexProviderGate";

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/play/:url"
            element={
              <ConvexProviderGate>
                <ApiKeyGate>
                  {(apiKey, api) => <Index apiKey={apiKey} api={api} />}
                </ApiKeyGate>
              </ConvexProviderGate>
            }
          />
          <Route
            path="/"
            element={
              <ConvexProviderGate>
                <ApiKeyGate>
                  {(apiKey, api) => <Index apiKey={apiKey} api={api} />}
                </ApiKeyGate>
              </ConvexProviderGate>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
