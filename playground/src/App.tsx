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
      <ConvexProviderGate>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ApiKeyGate>
                  {(apiKey, api) => <Index apiKey={apiKey} api={api} />}
                </ApiKeyGate>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ConvexProviderGate>
    </TooltipProvider>
  );
};

export default App;
