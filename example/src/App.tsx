import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { IdeaDetail } from "./pages/IdeaDetail";
import { Toaster } from "./components/ui/toaster";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
          <nav className="flex gap-4 items-center">
            <h2 className="text-xl font-semibold accent-text">Ideas Pile</h2>
            <Link to="/" className="hover:text-indigo-600">
              Home
            </Link>
          </nav>
        </header>
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:id" element={<IdeaDetail />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
