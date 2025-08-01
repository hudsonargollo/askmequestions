import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import HomePage from "@/react-app/pages/Home";
import LoginPage from "@/react-app/pages/Login";
import AdminPage from "@/react-app/pages/Admin";
import ImageGenerationPage from "@/react-app/pages/ImageGeneration";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/image-generation" element={<ImageGenerationPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
