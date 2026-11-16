import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SiteFooter from "./components/SiteFooter.jsx";
import SiteHeader from "./components/SiteHeader.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import DealerDashboardPage from "./pages/DealerDashboardPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import VehicleDetailPage from "./pages/VehicleDetailPage.jsx";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
function Layout({ children }) { return <><SiteHeader/>{children}<SiteFooter/></>; }
function AuthRoute({ mode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><span className="spinner"/></div>;
  if (user) return <Navigate to={user.role === "dealer" ? "/espace-concessionnaire" : "/annonces"} replace/>;
  return <AuthPage mode={mode}/>;
}
function DealerRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading"><span className="spinner"/></div>;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }}/>;
  if (user.role !== "dealer") return <Navigate to="/" replace/>;
  return <Layout><DealerDashboardPage/></Layout>;
}
function NotFound() { return <main className="container not-found"><span className="eyebrow">ERREUR 404</span><h1>On a pris<br/>la mauvaise route<span>.</span></h1><p>Cette page n’existe pas ou a changé de chemin.</p><a className="button button-dark" href="/">Retour à l’accueil</a></main>; }

export default function App() {
  return <><ScrollTop/><Routes>
    <Route path="/connexion" element={<AuthRoute mode="login"/>}/>
    <Route path="/inscription" element={<AuthRoute mode="register"/>}/>
    <Route path="/inscription-concessionnaire" element={<AuthRoute mode="dealer"/>}/>
    <Route path="/espace-concessionnaire" element={<DealerRoute/>}/>
    <Route path="/" element={<Layout><HomePage/></Layout>}/>
    <Route path="/annonces" element={<Layout><CatalogPage/></Layout>}/>
    <Route path="/voitures" element={<Layout><CatalogPage initialType="car"/></Layout>}/>
    <Route path="/motos" element={<Layout><CatalogPage initialType="motorcycle"/></Layout>}/>
    <Route path="/vehicules/:id" element={<Layout><VehicleDetailPage/></Layout>}/>
    <Route path="*" element={<Layout><NotFound/></Layout>}/>
  </Routes></>;
}
