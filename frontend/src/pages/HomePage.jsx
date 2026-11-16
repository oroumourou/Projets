import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Bike, CarFront, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, unwrapPage } from "../api/client.js";
import VehicleCard, { EmptyVehicles, VehicleSkeleton } from "../components/VehicleCard.jsx";
import { PageError } from "../components/PageStates.jsx";

const hero = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2200&q=90";
export default function HomePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  async function load() {
    setLoading(true); setError("");
    try { setVehicles(unwrapPage(await apiRequest("/vehicles/?ordering=-published_at")).slice(0, 3)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (kind) params.set("vehicle_type", kind);
    if (search.trim()) params.set("search", search.trim());
    navigate(`/annonces${params.size ? `?${params}` : ""}`);
  }
  return <>
    <section className="hero" style={{ "--hero-image": `url("${hero}")` }}>
      <div className="container hero-copy"><span className="eyebrow light"><i/> LE NEUF, EN MOUVEMENT</span><h1>La route vous<br/>va si bien<span>.</span></h1><p>La prochaine belle histoire commence avec le bon véhicule.</p><a className="hero-link" href="#annonces">Découvrir les annonces <ArrowDownRight size={17}/></a></div>
      <span className="hero-caption">01 — 03 <b/> VOTRE PROCHAIN DÉPART</span>
    </section>
    <section className="container search-area"><form className="search-panel" onSubmit={submit}>
      <div className="search-tabs"><button type="button" className={!kind ? "active" : ""} onClick={() => setKind("")}>Tout</button><button type="button" className={kind === "car" ? "active" : ""} onClick={() => setKind("car")}><CarFront size={15}/> Voitures</button><button type="button" className={kind === "motorcycle" ? "active" : ""} onClick={() => setKind("motorcycle")}><Bike size={15}/> Motos</button></div>
      <label className="search-input"><span>VOTRE PROCHAIN VÉHICULE</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Marque, modèle, ville…"/></label>
      <button className="button button-lime">Explorer <ArrowRight size={16}/></button><span className="search-note"><BadgeCheck size={14}/> Uniquement des véhicules neufs</span>
    </form></section>
    <section className="section container" id="annonces"><div className="section-head"><div><span className="eyebrow">LE BON CHOIX, AU BON ENDROIT</span><h2>À la une<span>.</span></h2></div><Link className="text-link" to="/annonces">Toutes les annonces <ArrowUpRight size={16}/></Link></div>
      {error ? <PageError message={error} onRetry={load}/> : loading ? <div className="vehicle-grid">{[1,2,3].map((x) => <VehicleSkeleton key={x}/>)}</div> : vehicles.length ? <div className="vehicle-grid">{vehicles.map((v) => <VehicleCard key={v.id} vehicle={v}/>)}</div> : <EmptyVehicles title="Les premières annonces arrivent bientôt" message="Les véhicules publiés par nos concessionnaires s’afficheront ici."/>}
    </section>
    <section className="categories"><div className="container"><div className="section-head"><div><span className="eyebrow">À CHACUN SON CHEMIN</span><h2>Choisissez votre terrain<br/>de jeu<span>.</span></h2></div><p>La ville, la route, les grands espaces.<br/>Le véhicule qui vous ressemble est là.</p></div><div className="category-grid">
      <Link to="/voitures" className="category category-car"><CarFront size={92}/><span>ÉLÉGANCE & CONFORT</span><h3>Voitures</h3><b>Explorer les voitures <ArrowRight size={15}/></b></Link>
      <Link to="/motos" className="category category-bike"><Bike size={96}/><span>LIBERTÉ & SENSATIONS</span><h3>Motos</h3><b>Explorer les motos <ArrowRight size={15}/></b></Link>
    </div></div></section>
    <section className="trust"><div className="container trust-inner"><div><span className="eyebrow">L’ACHAT SANS DOUTE</span><h2>Le plaisir du neuf.<br/>La confiance en plus<span>.</span></h2><p>Un achat important mérite de la clarté à chaque étape. AutoMoto vous rapproche de professionnels qui connaissent leur métier.</p><Link className="text-link light-link" to="/annonces">Trouver mon véhicule <ArrowUpRight size={15}/></Link></div>
      <div className="trust-list"><article><BadgeCheck/><div><h3>Du neuf, rien que du neuf</h3><p>Des véhicules neufs proposés par des professionnels.</p></div></article><article><ShieldCheck/><div><h3>Des vendeurs professionnels</h3><p>Les comptes vendeurs sont vérifiés avant publication.</p></div></article><article><Sparkles/><div><h3>Le bon choix, sans détour</h3><p>Comparez les modèles, prix et détails qui comptent.</p></div></article></div></div></section>
    <section className="container dealer-banner"><div><span className="eyebrow">VOUS ÊTES CONCESSIONNAIRE ?</span><h2>Faites avancer<br/>votre activité<span>.</span></h2></div><div><p>Présentez votre stock à des acheteurs qui savent ce qu’ils cherchent.</p><Link className="button button-dark" to="/inscription-concessionnaire">Rejoindre AutoMoto <ArrowUpRight size={15}/></Link></div></section>
  </>;
}
