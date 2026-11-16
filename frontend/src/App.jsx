import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Footer from "./components/Footer.jsx";
import Navbar from "./components/Navbar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import HostPage from "./pages/HostPage.jsx";
import ListingsPage from "./pages/ListingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PropertyPage from "./pages/PropertyPage.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return <>
    <ScrollToTop />
    <Navbar />
    <main id="top">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/logements" element={<ListingsPage />} />
        <Route path="/logements/:id" element={<PropertyPage />} />
        <Route path="/connexion" element={<AuthPage mode="login" />} />
        <Route path="/inscription" element={<AuthPage mode="register" />} />
        <Route path="/hote" element={<HostPage />} />
        <Route path="/compte" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
    <Footer />
  </>;
}
