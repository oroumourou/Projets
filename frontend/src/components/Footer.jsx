import { ArrowUpRight, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div><Link className="brand footer-brand" to="/"><span className="brand-mark">m</span><span>mobila<span className="brand-dot">.</span></span></Link><p>Des lieux singuliers.<br />Des souvenirs qui restent.</p></div>
        <div className="footer-links"><div><strong>Découvrir</strong><Link to="/logements">Tous les logements</Link><Link to="/hote">Devenir hôte</Link></div><div><strong>Votre espace</strong><Link to="/compte">Mes séjours</Link><Link to="/connexion">Connexion</Link></div></div>
        <a className="back-top" href="#top">Retour en haut <ArrowUp size={15} /></a>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Mobila. Tous droits réservés.</span><span>Voyagez autrement, tout simplement.</span><a href="mailto:contact@mobila.example">Contact <ArrowUpRight size={13} /></a></div>
    </footer>
  );
}
