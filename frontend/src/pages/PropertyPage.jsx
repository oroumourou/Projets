import { ArrowLeft, ArrowRight, Bath, BedDouble, CalendarDays, CheckCircle2, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage, formatDate, formatPrice } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MediaGallery from "../components/MediaGallery.jsx";
import { ErrorState, LoadingState, SuccessMessage } from "../components/StatusMessage.jsx";

const today = new Date();
const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

export default function PropertyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ check_in: "", check_out: "", guests: 1 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [result, reviewResult] = await Promise.all([api.get(`/properties/${id}/`), api.get(`/properties/${id}/reviews/`)]);
      setProperty(result);
      setReviews(reviewResult.results || reviewResult);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const nights = form.check_in && form.check_out ? Math.max(0, Math.round((new Date(`${form.check_out}T12:00:00`) - new Date(`${form.check_in}T12:00:00`)) / 86400000)) : 0;
  const estimate = Number(property?.nightly_price || 0) * nights;

  async function reserve(event) {
    event.preventDefault();
    if (!user) {
      navigate("/connexion", { state: { from: { pathname: `/logements/${id}` } } });
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/bookings/", { property_id: property.id, check_in: form.check_in, check_out: form.check_out, guests: Number(form.guests) });
      setSuccess("Votre demande a été envoyée à l’hôte. Vous pourrez suivre sa réponse depuis votre compte.");
      setForm({ check_in: "", check_out: "", guests: 1 });
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-shell"><LoadingState label="Ouverture de cette adresse…" /></div>;
  if (error && !property) return <div className="page-shell"><ErrorState message={error} onRetry={load} /><Link className="link-arrow" to="/logements"><ArrowLeft size={16} /> Retour aux logements</Link></div>;
  if (!property) return null;

  return <div className="property-page page-shell">
    <Link className="back-link" to="/logements"><ArrowLeft size={15} /> Tous les logements</Link>
    <div className="property-heading"><div><span className="eyebrow"><i /> {property.property_type === "house" ? "MAISON" : property.property_type === "studio" ? "STUDIO" : property.property_type === "room" ? "CHAMBRE" : "APPARTEMENT"} · MOBILA</span><h1>{property.title}</h1><p><MapPin size={16} />{property.city}, {property.country}</p></div><div className="property-rating">{Number(property.review_count) > 0 ? <><Star size={16} fill="currentColor" /> <strong>{Number(property.average_rating).toFixed(1)}</strong><a href="#reviews">{property.review_count} avis</a></> : <span>Nouvelle adresse</span>}</div></div>
    <MediaGallery media={property.media} title={property.title} />
    <div className="property-detail-grid">
      <div className="property-main-content">
        <div className="host-byline"><div className="host-avatar">{property.owner_name?.slice(0, 1).toUpperCase() || "M"}</div><div><strong>Hébergé par {property.owner_name}</strong><span>Votre hôte Mobila</span></div><ShieldCheck size={19} /></div>
        <div className="property-facts"><span><Users size={18} /> Jusqu’à {property.max_guests} voyageurs</span><span><BedDouble size={18} /> {property.bedrooms} chambre{property.bedrooms === 1 ? "" : "s"}</span><span><Bath size={18} /> {property.bathrooms} salle{Number(property.bathrooms) === 1 ? "" : "s"} de bain</span></div>
        <section className="detail-section"><span className="eyebrow"><i /> À PROPOS DU LIEU</span><h2>Un séjour <em>à votre image.</em></h2><p className="property-description">{property.description}</p></section>
        {property.amenities?.length > 0 && <section className="detail-section amenities-section"><span className="eyebrow"><i /> À VOTRE DISPOSITION</span><h2>Les petits <em>plus.</em></h2><div className="amenity-list">{property.amenities.map((amenity) => <span key={amenity}><CheckCircle2 size={15} />{amenity}</span>)}</div></section>}
        <section className="detail-section reviews-section" id="reviews"><span className="eyebrow"><i /> LES MOTS DE NOS VOYAGEURS</span><h2>{reviews.length ? "Des souvenirs partagés." : "Les premiers avis arrivent."}</h2>{reviews.length ? <div className="review-grid">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-meta"><strong>{review.author_name}</strong><span><Star size={13} fill="currentColor" /> {review.rating}/5</span></div><p>{review.comment || "Un beau séjour chez Mobila."}</p><small>{formatDate(review.created_at.slice(0, 10))}</small></article>)}</div> : <p className="muted-copy">Les avis sont publiés après les séjours confirmés.</p>}</section>
      </div>
      <aside className="booking-card"><span className="eyebrow"><i /> VOTRE ESCAPADE</span><div className="booking-price"><strong>{formatPrice(property.nightly_price)}</strong><span> / nuit</span></div>
        {success && <SuccessMessage>{success}</SuccessMessage>}{error && property && <ErrorState message={error} />}
        {property.is_owner ? <div className="owner-booking-note"><ShieldCheck size={19} /><p>C’est votre annonce. Retrouvez vos demandes de séjour dans votre espace hôte.</p><Link className="button button-outline" to="/hote">Gérer l’annonce <ArrowRight size={15} /></Link></div> : <form className="booking-form" onSubmit={reserve}>
          <label className="form-label"><CalendarDays size={14} /> Arrivée<input type="date" name="check_in" min={todayInput} value={form.check_in} onChange={update} required /></label>
          <label className="form-label"><CalendarDays size={14} /> Départ<input type="date" name="check_out" min={form.check_in || todayInput} value={form.check_out} onChange={update} required /></label>
          <label className="form-label">Voyageurs<select name="guests" value={form.guests} onChange={update}>{Array.from({ length: Number(property.max_guests) }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count} voyageur{count > 1 ? "s" : ""}</option>)}</select></label>
          {nights > 0 && <div className="estimate-line"><span>{formatPrice(property.nightly_price)} × {nights} nuit{nights > 1 ? "s" : ""}</span><strong>{formatPrice(estimate)}</strong></div>}
          <button className="button button-dark booking-submit" disabled={busy}>{busy ? "Envoi…" : user ? "Demander à réserver" : "Connectez-vous pour réserver"} <ArrowRight size={16} /></button>
          <p className="booking-disclaimer">Aucun paiement n’est effectué en ligne. L’hôte doit confirmer la demande sous 24 h.</p>
        </form>}
      </aside>
    </div>
  </div>;
}
