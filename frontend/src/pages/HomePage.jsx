import { ArrowDown, ArrowRight, ArrowUpRight, Compass, House, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import PropertyCard from "../components/PropertyCard.jsx";
import { ErrorState, LoadingState } from "../components/StatusMessage.jsx";

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState("");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/properties/?page=1&ordering=-created_at");
      setProperties(response.results.slice(0, 3));
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function search(event) {
    event.preventDefault();
    navigate(`/logements${city.trim() ? `?city=${encodeURIComponent(city.trim())}` : ""}`);
  }

  return <div className="home-page">
    <section className="hero">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-overlay" />
      <div className="hero-inner page-shell">
        <span className="eyebrow eyebrow-light"><i /> L’ART DE SE SENTIR CHEZ SOI</span>
        <h1>Partir loin.<br /><em>Se sentir chez soi.</em></h1>
        <p>Des maisons et appartements choisis pour leurs histoires, leurs hôtes, et ces moments qu’on n’oublie pas.</p>
        <form className="hero-search" onSubmit={search}>
          <label><MapPin size={18} /><span>Où souhaitez-vous aller ?</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Une ville, une région…" /></label>
          <button className="button button-dark" type="submit"><Search size={16} /> Explorer</button>
        </form>
        <div className="hero-footnote"><span>Des lieux authentiques, partout en France</span><ArrowDown size={16} /></div>
      </div>
      <span className="hero-index">01 — 03 <i /> MOBILA JOURNEYS</span>
    </section>

    <section className="home-intro page-shell">
      <div className="section-kicker"><span className="eyebrow"><i /> UN AUTRE GOÛT DU VOYAGE</span><span className="intro-number">01 / 03</span></div>
      <div className="home-intro-grid"><h2>Choisir un lieu.<br /><em>Emporter une histoire.</em></h2><p>Nos logements ne sont pas de simples adresses. Ce sont des portes ouvertes sur une région, un art de vivre, une façon de ralentir. Trouvez le vôtre.</p></div>
      <Link to="/logements" className="link-arrow">Tous les logements <ArrowUpRight size={17} /></Link>
    </section>

    <section className="featured-section">
      <div className="page-shell">
        <div className="section-heading"><div><span className="eyebrow"><i /> LE CARNET MOBILA</span><h2>Nos dernières <em>adresses.</em></h2></div><Link className="button button-outline" to="/logements">Tout explorer <Compass size={16} /></Link></div>
        {loading && <LoadingState label="Nous préparons votre prochaine escale…" />}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && properties.length > 0 && <div className="property-grid">{properties.map((property) => <PropertyCard key={property.id} property={property} />)}</div>}
        {!loading && !error && properties.length === 0 && <div className="empty-feature"><House size={25} /><p>Les premières adresses arrivent bientôt.</p><Link to="/hote">Proposer un logement <ArrowRight size={15} /></Link></div>}
      </div>
    </section>

    <section className="home-values page-shell">
      <div className="values-copy"><span className="eyebrow"><i /> POUR LES VOYAGEURS ET LES HÔTES</span><h2>Le voyage commence<br />par <em>la confiance.</em></h2><p>Des demandes de réservation claires, des avis liés à de vrais séjours, et des échanges directs avec votre hôte.</p><Link className="button button-dark" to="/logements">Trouver mon prochain séjour <ArrowRight size={16} /></Link></div>
      <div className="values-grid"><div><span><Sparkles size={18} /></span><strong>Des lieux singuliers</strong><small>Maison, appartement ou chambre : chaque annonce a son histoire.</small></div><div><span><ShieldCheck size={18} /></span><strong>Des séjours vérifiés</strong><small>Les avis sont réservés aux voyageurs ayant séjourné dans le logement.</small></div><div><span><House size={18} /></span><strong>Une relation directe</strong><small>L’hôte répond à chaque demande depuis son espace.</small></div></div>
    </section>
  </div>;
}
