import { useState } from "react";
import { ArrowUpRight, Bike, Fuel, Heart, MapPin, Settings2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, assetUrl } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const fallback = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=85";
export function formatPrice(value, currency = "EUR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Prix sur demande";
  try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`; }
}

export default function VehicleCard({ vehicle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const key = `automoto.liked.${user?.id}.${vehicle.id}`;
  const [liked, setLiked] = useState(() => localStorage.getItem(key) === "true");
  const [count, setCount] = useState(vehicle.like_count || 0);
  const [busy, setBusy] = useState(false);
  async function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return navigate("/connexion");
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiRequest(`/vehicles/${vehicle.slug}/like/`, { method: "POST" });
      setLiked(data.liked); setCount(data.like_count);
      localStorage.setItem(key, String(data.liked));
    } catch (error) { window.alert(error.message); }
    finally { setBusy(false); }
  }
  const moto = vehicle.vehicle_type === "motorcycle";
  return <article className="vehicle-card"><Link to={`/vehicules/${vehicle.id}`} className="card-link">
    <div className="card-image"><img src={assetUrl(vehicle.images?.[0]?.image) || fallback} alt={`${vehicle.make} ${vehicle.model}`} onError={(event) => { event.currentTarget.src = fallback; }}/><span className="new-badge"><i/> Neuf</span><span className="vehicle-kind">{moto ? <Bike size={17}/> : <CarFrontIcon/>}</span></div>
    <div className="card-body"><div className="card-kicker">{vehicle.make} · {vehicle.year}</div><h3>{vehicle.model}{vehicle.trim ? ` · ${vehicle.trim}` : ""}<ArrowUpRight size={17}/></h3>
      <div className="card-specs">{vehicle.fuel_type && <span><Fuel size={14}/>{vehicle.fuel_type}</span>}{vehicle.transmission && <span><Settings2 size={14}/>{vehicle.transmission}</span>}<span><MapPin size={14}/>{vehicle.city}</span></div>
      <div className="card-bottom"><strong>{formatPrice(vehicle.price, vehicle.currency)}</strong><button className={liked ? "like-button liked" : "like-button"} disabled={busy} onClick={toggle} aria-label="Ajouter aux favoris"><Heart size={16} fill={liked ? "currentColor" : "none"}/><span>{count}</span></button></div>
    </div>
  </Link></article>;
}
function CarFrontIcon() { return <span className="auto-icon">AUTO</span>; }

export function VehicleSkeleton() {
  return <div className="vehicle-card"><div className="skeleton-image shimmer"/><div className="card-body"><div className="shimmer skeleton-line"/><div className="shimmer skeleton-title"/><div className="shimmer skeleton-line"/></div></div>;
}

export function EmptyVehicles({ title = "Aucun véhicule trouvé", message = "Essayez d’élargir votre recherche ou revenez bientôt." }) {
  return <div className="empty-state"><span className="empty-mark"><Bike/></span><h3>{title}</h3><p>{message}</p></div>;
}
