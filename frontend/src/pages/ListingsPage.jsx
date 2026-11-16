import { ArrowDownUp, ChevronLeft, ChevronRight, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import PropertyCard from "../components/PropertyCard.jsx";
import { ErrorState, LoadingState } from "../components/StatusMessage.jsx";

const EMPTY = { city: "", guests: "", property_type: "", min_price: "", max_price: "", search: "", ordering: "-created_at" };

function fromParams(params) {
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, params.get(key) || EMPTY[key]]));
}

function toParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([key, value]) => value && !(key === "ordering" && value === "-created_at")));
}

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => fromParams(searchParams));
  const [listings, setListings] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function load(pageNumber, currentFilters) {
    const params = new URLSearchParams({ page: pageNumber });
    Object.entries(currentFilters).forEach(([key, value]) => { if (value) params.set(key, value); });
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/properties/?${params}`);
      setListings(data.results);
      setCount(data.count);
      setNext(data.next);
      setPage(pageNumber);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const current = fromParams(searchParams);
    setFilters(current);
    load(1, current);
  }, [searchParams]);

  function update(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    setSearchParams(toParams(filters));
    setMobileFiltersOpen(false);
  }

  function clear() {
    setSearchParams({});
  }

  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "ordering" && value);
  const advancedFilters = <>
    <label><span>TYPE DE LOGEMENT</span><select name="property_type" value={filters.property_type} onChange={update}><option value="">Tous</option><option value="house">Maison</option><option value="apartment">Appartement</option><option value="studio">Studio</option><option value="room">Chambre</option></select></label>
    <label><span>BUDGET / NUIT</span><div className="price-inputs"><input type="number" min="1" name="min_price" value={filters.min_price} onChange={update} placeholder="Min. €" /><input type="number" min="1" name="max_price" value={filters.max_price} onChange={update} placeholder="Max. €" /></div></label>
    <label><span>ORDRE</span><select name="ordering" value={filters.ordering} onChange={update}><option value="-created_at">Les plus récents</option><option value="nightly_price">Prix croissant</option><option value="-nightly_price">Prix décroissant</option></select></label>
  </>;

  return <div className="listings-page page-shell">
    <div className="listings-intro"><div><span className="eyebrow"><i /> LE CARNET MOBILA</span><h1>Trouvez votre<br /><em>prochain chez-vous.</em></h1></div><p>Des lieux choisis pour ce qu’ils ont de plus précieux : une âme, une histoire, et l’envie de vous accueillir.</p></div>
    <form className="filter-toolbar" onSubmit={submit}>
      <label className="filter-search"><Search size={17} /><input name="search" value={filters.search} onChange={update} placeholder="Un lieu, une envie…" /></label>
      <label><span>VILLE</span><input name="city" value={filters.city} onChange={update} placeholder="Toutes les villes" /></label>
      <label><span>VOYAGEURS</span><select name="guests" value={filters.guests} onChange={update}><option value="">Peu importe</option>{[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} personne{n > 1 ? "s" : ""} ou +</option>)}</select></label>
      <button type="button" className="filter-mobile-trigger" onClick={() => setMobileFiltersOpen((open) => !open)}><SlidersHorizontal size={17} /> Filtres</button>
      <button className="button button-dark filter-submit" type="submit">Rechercher <ArrowDownUp size={15} /></button>
    </form>
    {mobileFiltersOpen && <form className="mobile-filter-panel" onSubmit={submit}>{advancedFilters}<button className="button button-dark" type="submit"><Filter size={16} /> Appliquer les filtres</button></form>}
    <div className="results-bar"><p><strong>{count}</strong> adresse{count > 1 ? "s" : ""} à découvrir {filters.city && <span>à {filters.city}</span>}</p>{hasFilters && <button className="clear-filters" onClick={clear}><X size={14} /> Effacer les filtres</button>}<label className="sort-select"><span>Trier par</span><select value={filters.ordering} onChange={(event) => setSearchParams(toParams({ ...filters, ordering: event.target.value }))}><option value="-created_at">Plus récents</option><option value="nightly_price">Prix croissant</option><option value="-nightly_price">Prix décroissant</option></select></label></div>
    {loading && <LoadingState label="Nous cherchons votre prochaine escale…" />}
    {!loading && error && <ErrorState message={error} onRetry={() => load(page, filters)} />}
    {!loading && !error && listings.length > 0 && <div className="property-grid listings-grid">{listings.map((property) => <PropertyCard key={property.id} property={property} />)}</div>}
    {!loading && !error && listings.length === 0 && <div className="empty-state"><span className="empty-ornament">✳</span><h2>Aucun logement pour ces critères.</h2><p>Essayez une autre ville ou élargissez votre recherche.</p><button className="button button-outline" onClick={clear}>Voir toutes les adresses <X size={15} /></button></div>}
    <div className="pagination"><button className="icon-button" disabled={page <= 1 || loading} onClick={() => load(page - 1, filters)} aria-label="Page précédente"><ChevronLeft size={18} /></button><span>Page {page}</span><button className="icon-button" disabled={!next || loading} onClick={() => load(page + 1, filters)} aria-label="Page suivante"><ChevronRight size={18} /></button></div>
  </div>;
}
