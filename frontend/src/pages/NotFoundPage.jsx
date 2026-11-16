import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <div className="not-found page-shell"><span>404 · HORS PISTE</span><h1>Cette adresse<br /><em>n’existe pas.</em></h1><p>La page que vous cherchez a peut-être changé d’adresse.</p><Link className="button button-dark" to="/logements"><Compass size={16} />Explorer les logements</Link><Link className="back-link" to="/"><ArrowLeft size={14} /> Retour à l’accueil</Link></div>;
}
