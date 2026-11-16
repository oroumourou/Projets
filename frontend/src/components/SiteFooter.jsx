import { ArrowUpRight, CarFront } from "lucide-react";
import { Link } from "react-router-dom";

export default function SiteFooter() {
  return <footer className="footer" id="concessionnaires"><div className="footer-grid">
    <div><Link className="brand brand-light" to="/"><span className="brand-icon"><CarFront size={19}/></span><span>auto<span>moto</span></span></Link><p>Le plaisir du neuf.<br/>La confiance en plus.</p></div>
    <div><b>Explorer</b><Link to="/voitures">Voitures neuves</Link><Link to="/motos">Motos neuves</Link><Link to="/annonces">Toutes les annonces</Link></div>
    <div><b>Pour les professionnels</b><Link to="/inscription-concessionnaire">Devenir concessionnaire <ArrowUpRight size={13}/></Link><Link to="/connexion">Espace vendeur</Link></div>
    <div><b>Votre prochain départ commence ici.</b><p>Des véhicules neufs. Des vendeurs professionnels. Votre prochain coup de cœur.</p></div>
  </div><div className="footer-bottom"><span>© {new Date().getFullYear()} AutoMoto. Tous droits réservés.</span><span>Conçu pour avancer.</span></div></footer>;
}
