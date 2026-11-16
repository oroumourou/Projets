import { Compass, Menu, Plus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" to="/" aria-label="Mobila, accueil"><span className="brand-mark">m</span><span>mobila<span className="brand-dot">.</span></span></Link>
        <button className="menu-toggle" onClick={() => setOpen((value) => !value)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Navigation principale">
          <NavLink to="/logements" onClick={() => setOpen(false)}><Compass size={16} />Explorer</NavLink>
          <NavLink to="/hote" onClick={() => setOpen(false)}><Plus size={16} />Devenir hôte</NavLink>
          {!ready ? <span className="nav-placeholder" /> : user ? <>
            <NavLink to="/compte" onClick={() => setOpen(false)}><UserRound size={16} />Mon compte</NavLink>
            <button className="nav-signout" onClick={signOut}>Déconnexion</button>
          </> : <Link className="nav-login" to="/connexion" onClick={() => setOpen(false)}>Connexion <span aria-hidden="true">↗</span></Link>}
        </nav>
      </div>
    </header>
  );
}
