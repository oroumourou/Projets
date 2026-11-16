import { useState } from "react";
import { ArrowUpRight, Bike, CarFront, Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const close = () => setOpen(false);
  return <header className="header"><div className="header-inner">
    <Link to="/" className="brand" onClick={close}><span className="brand-icon"><CarFront size={19}/><Bike size={15}/></span><span>auto<span>moto</span></span></Link>
    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}>{open ? <X/> : <Menu/>}</button>
    <nav className={open ? "nav open" : "nav"}><NavLink to="/voitures" onClick={close}>Voitures</NavLink><NavLink to="/motos" onClick={close}>Motos</NavLink><a href="/#concessionnaires" onClick={close}>Concessionnaires</a></nav>
    <div className={open ? "header-actions open" : "header-actions"}>{user ? <>
      {user.role === "dealer" && <Link className="text-button" to="/espace-concessionnaire">Mon espace</Link>}
      <span className="user-chip">{user.first_name || user.email}</span><button className="text-button" onClick={() => { logout(); close(); }}>Déconnexion</button>
    </> : <><Link className="text-button" to="/connexion" onClick={close}>Se connecter</Link><Link className="button button-dark small" to="/inscription" onClick={close}>Créer un compte <ArrowUpRight size={15}/></Link></>}</div>
  </div></header>;
}
