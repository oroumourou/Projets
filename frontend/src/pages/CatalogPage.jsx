import { useEffect, useState } from "react";
import { ArrowDownUp, ArrowUpRight, Bike, CarFront, Search, SlidersHorizontal, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest, unwrapPage } from "../api/client.js";
import VehicleCard, { EmptyVehicles, VehicleSkeleton } from "../components/VehicleCard.jsx";
import { PageError } from "../components/PageStates.jsx";

export default function CatalogPage({ initialType = "" }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [make, setMake] = useState(params.get("make") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [type, setType] = useState(params.get("vehicle_type") || initialType);
  const [min, setMin] = useState(params.get("min_price") || "");
  const [max, setMax] = useState(params.get("max_price") || "");
  const [sort, setSort] = useState("-published_at");
  const [filters, setFilters] = useState(false);
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(url) {
    setLoading(true); setError("");
    try {
      const result = await apiRequest(url);
      setData({ results: unwrapPage(result), count: result.count ?? unwrapPage(result).length, next: result.next, previous: result.previous });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const q = new URLSearchParams();
    if (type) q.set("vehicle_type", type);
    if (params.get("search")) q.set("search", params.get("search"));
    if (params.get("make")) q.set("make", params.get("make"));
    if (params.get("city")) q.set("city", params.get("city"));
    if (params.get("min_price")) q.set("min_price", params.get("min_price"));
    if (params.get("max_price")) q.set("max_price", params.get("max_price"));
    q.set("ordering", sort);
    load(`/vehicles/?${q}`);
  }, [params, type, sort]);
  function apply(e) {
    e?.preventDefault();
    const q = new URLSearchParams();
    if (type) q.set("vehicle_type", type);
    if (search.trim()) q.set("search", search.trim());
    if (make.trim()) q.set("make", make.trim());
    if (city.trim()) q.set("city", city.trim());
    if (min) q.set("min_price", min);
    if (max) q.set("max_price", max);
    setParams(q); setFilters(false);
  }
  function clear() { setSearch(""); setMake(""); setCity(""); setMin(""); setMax(""); setType(initialType); setParams(initialType ? { vehicle_type: initialType } : {}); }
  const title = type === "car" ? "Voitures neuves" : type === "motorcycle" ? "Motos neuves" : "Tous les véhicules";
  return <main className="catalog-page"><section className="catalog-hero"><div className="container"><div className="breadcrumbs"><Link to="/">Accueil</Link> / Annonces</div><span className="eyebrow">LE NEUF, EN MOUVEMENT</span><div className="catalog-title"><div><h1>{title}<span>.</span></h1><p>Des véhicules neufs sélectionnés auprès de concessionnaires professionnels.</p></div>{type === "motorcycle" ? <Bike size={34}/> : <CarFront size={35}/>}</div>
    <form className="catalog-search" onSubmit={apply}><Search size={18}/><input aria-label="Recherche" placeholder="Rechercher une marque, un modèle…" value={search} onChange={(e) => setSearch(e.target.value)}/><button className="button button-dark">Rechercher <ArrowUpRight size={15}/></button></form></div></section>
    <section className="container catalog-content"><div className="catalog-toolbar"><span><strong>{data.count}</strong> véhicule{data.count === 1 ? "" : "s"} trouvé{data.count === 1 ? "" : "s"}</span><div><button className="text-button" onClick={() => setFilters(!filters)}><SlidersHorizontal size={15}/> Filtres</button><label className="sort"><ArrowDownUp size={14}/><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="-published_at">Plus récents</option><option value="price">Prix croissant</option><option value="-price">Prix décroissant</option><option value="-year">Année récente</option></select></label></div></div>
      {filters && <form className="filter-panel" onSubmit={apply}><div className="filter-head"><div><span className="eyebrow">AFFINER LA RECHERCHE</span><h2>Vos critères</h2></div><button type="button" className="icon-button" onClick={() => setFilters(false)}><X/></button></div><div className="filter-grid">
        <label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="">Tous</option><option value="car">Voiture</option><option value="motorcycle">Moto</option></select></label>
        <label>Marque<input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Ex. Toyota"/></label>
        <label>Ville<input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. Abidjan"/></label>
        <label>Prix minimum<input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)}/></label>
        <label>Prix maximum<input type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)}/></label>
      </div><div className="filter-actions"><button type="button" className="text-button" onClick={clear}>Effacer</button><button className="button button-lime">Afficher les résultats <ArrowUpRight size={15}/></button></div></form>}
      {error ? <PageError message={error} onRetry={() => load(`/vehicles/?ordering=${sort}`)}/> : loading ? <div className="vehicle-grid">{[1,2,3,4,5,6].map((x) => <VehicleSkeleton key={x}/>)}</div> : data.results.length ? <><div className="vehicle-grid">{data.results.map((v) => <VehicleCard key={v.id} vehicle={v}/>)}</div><div className="pagination"><button className="button button-outline" disabled={!data.previous} onClick={() => load(data.previous.replace(/^.*\/api\/v1/, ""))}>Précédent</button><span>{data.count} annonces</span><button className="button button-outline" disabled={!data.next} onClick={() => load(data.next.replace(/^.*\/api\/v1/, ""))}>Suivant <ArrowUpRight size={14}/></button></div></> : <EmptyVehicles/>}
    </section></main>;
}
