import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { IdeasPage } from "./pages/Ideas";
import { IdeaDetail } from "./pages/IdeaDetail";
import { Toaster } from "./components/ui/toaster";
import ChatStreaming from "../../examples/chat-streaming/src/ChatStreaming";
import { Index } from "./pages/Index";
import { WeatherFashion } from "./pages/WeatherFashion";
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/weather-fashion" element={<WeatherFashion />} />
            <Route path="/chat-streaming" element={<ChatStreaming />} />
            <Route path="/ideas/:id" element={<IdeaDetail />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
