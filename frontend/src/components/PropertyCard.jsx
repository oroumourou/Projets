import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../api/client.js";

export default function PropertyCard({ property }) {
  const cover = property.media?.[0];
  return (
    <article className="property-card">
      <Link to={`/logements/${property.id}`} className="property-image-link" aria-label={`Voir ${property.title}`}>
        {cover?.kind === "image" ? <img className="property-image" src={cover.url} alt={cover.alt_text || property.title} loading="lazy" /> : cover?.kind === "video" ? <video className="property-image" src={cover.url} muted playsInline preload="metadata" /> : <div className="property-placeholder"><span>mobila.</span></div>}
        <span className="property-type">{property.property_type === "house" ? "Maison" : property.property_type === "studio" ? "Studio" : property.property_type === "room" ? "Chambre" : "Appartement"}</span>
      </Link>
      <div className="property-card-body">
        <div className="property-card-heading"><div><h3><Link to={`/logements/${property.id}`}>{property.title}</Link></h3><p className="property-location"><MapPin size={13} />{property.city}, {property.country}</p></div>{Number(property.review_count) > 0 && <span className="rating"><Star size={13} fill="currentColor" />{Number(property.average_rating).toFixed(1)}</span>}</div>
        <div className="property-card-bottom"><span>{property.max_guests} voyageurs <i /> {property.bedrooms} chambre{property.bedrooms > 1 ? "s" : ""}</span><strong>{formatPrice(property.nightly_price)} <small>/ nuit</small></strong></div>
        <Link className="card-arrow" to={`/logements/${property.id}`} aria-label={`Découvrir ${property.title}`}><ArrowUpRight size={16} /></Link>
      </div>
    </article>
  );
}
