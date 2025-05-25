import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { IdeasPage } from "./pages/Ideas";
import { IdeaDetail } from "./pages/IdeaDetail";
import { Toaster } from "./components/ui/toaster";
import { Home } from "./pages/Home";
import { Images } from "./pages/Images";
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
          <nav className="flex gap-4 items-center">
            <h2 className="text-xl font-semibold accent-text">Agent Example</h2>
            <Link to="/" className="hover:text-indigo-600">
              Home
            </Link>
            <Link to="/images" className="hover:text-indigo-600">
              Image example
            </Link>
          </nav>
        </header>
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/ideas/:id" element={<IdeaDetail />} />
            <Route path="/images" element={<Images />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
