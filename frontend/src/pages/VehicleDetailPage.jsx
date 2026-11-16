import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Bike, CalendarDays, Fuel, Gauge, Heart, MapPin, MessageCircle, Phone, Share2, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest, assetUrl } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatPrice } from "../components/VehicleCard.jsx";
import { LoadingState, PageError } from "../components/PageStates.jsx";

const fallback = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=85";
export default function VehicleDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [photo, setPhoto] = useState(0);
  async function load() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest(`/vehicles/${id}/`);
      setVehicle(data); setCount(data.like_count || 0);
      setLiked(localStorage.getItem(`automoto.liked.${user?.id}.${data.id}`) === "true");
      const discussion = await apiRequest(`/vehicles/${data.slug}/comments/`);
      setComments(Array.isArray(discussion) ? discussion : discussion.results || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id, user?.id]);
  async function toggleLike() {
    if (!user) return navigate("/connexion");
    try {
      const result = await apiRequest(`/vehicles/${vehicle.slug}/like/`, { method: "POST" });
      setLiked(result.liked); setCount(result.like_count);
      localStorage.setItem(`automoto.liked.${user.id}.${vehicle.id}`, String(result.liked));
    } catch (e) { setNotice(e.message); }
  }
  async function postComment(e) {
    e.preventDefault();
    if (!user) return navigate("/connexion");
    if (!comment.trim()) return;
    setBusy(true); setNotice("");
    try {
      const result = await apiRequest(`/vehicles/${vehicle.slug}/comments/`, { method: "POST", body: { content: comment.trim() } });
      setComments((old) => [result, ...old]); setComment("");
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  async function share() {
    try {
      if (navigator.share) { await navigator.share({ title: vehicle.title, url: location.href }); }
      else { await navigator.clipboard.writeText(location.href); setNotice("Lien copié."); }
      await apiRequest(`/vehicles/${vehicle.slug}/share/`, { method: "POST", body: { platform: "link" } });
    } catch (e) { if (e.name !== "AbortError") setNotice(e.message); }
  }
  if (loading) return <main className="container"><LoadingState/></main>;
  if (error || !vehicle) return <main className="container detail-error"><PageError message={error || "Annonce introuvable"} onRetry={load}/><Link to="/annonces"><ArrowLeft size={15}/> Retour au catalogue</Link></main>;
  const images = vehicle.images?.length ? vehicle.images : [{ image: fallback }];
  const dealer = vehicle.dealer || {};
  const features = [["Année modèle", vehicle.year, CalendarDays], ["Kilométrage", `${vehicle.mileage_km || 0} km`, Gauge], ["Énergie", vehicle.fuel_type, Fuel], ["Transmission", vehicle.transmission, Bike], ["Puissance", vehicle.power_hp ? `${vehicle.power_hp} ch` : "", ArrowUpRight], ["État", "Neuf", ShieldCheck]].filter((x) => x[1]);
  return <main className="container detail-page"><div className="breadcrumbs"><Link to="/">Accueil</Link> / <Link to="/annonces">Annonces</Link> / {vehicle.make} {vehicle.model}</div><Link to="/annonces" className="back-link"><ArrowLeft size={15}/> Retour aux annonces</Link>
    <div className="detail-layout"><div><div className="detail-image"><img src={assetUrl(images[photo]?.image) || fallback} alt={vehicle.title} onError={(e) => { e.currentTarget.src = fallback; }}/><span className="new-badge"><i/> VÉHICULE NEUF</span><button className={liked ? "detail-like liked" : "detail-like"} onClick={toggleLike} aria-label="Ajouter aux favoris"><Heart fill={liked ? "currentColor" : "none"}/><span>{count}</span></button></div>
      {images.length > 1 && <div className="thumbnails">{images.map((image, i) => <button key={image.id || i} className={i === photo ? "active" : ""} onClick={() => setPhoto(i)}><img src={assetUrl(image.image)} alt={`Vue ${i + 1}`}/></button>)}</div>}
      <div className="detail-title"><div><span className="eyebrow">{vehicle.vehicle_type === "motorcycle" ? "MOTO NEUVE" : "VOITURE NEUVE"} · {vehicle.year}</span><h1>{vehicle.make} <span>{vehicle.model}</span></h1>{vehicle.trim && <p>{vehicle.trim}</p>}</div><button className="button button-outline" onClick={share}><Share2 size={15}/> Partager</button></div>
      <p className="location"><MapPin size={15}/>{vehicle.city}, {vehicle.country}<span/> {dealer.business_name || "Concessionnaire"}</p>
      <section className="detail-section"><span className="eyebrow">LES DÉTAILS QUI COMPTENT</span><h2>Fiche technique</h2><div className="spec-grid">{features.map(([label, value, Icon]) => <div className="spec" key={label}><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>)}</div></section>
      <section className="detail-section"><span className="eyebrow">À PROPOS DU VÉHICULE</span><h2>La prochaine aventure commence ici.</h2><p className="description">{vehicle.description}</p></section>
      <section className="detail-section" id="questions"><span className="eyebrow">VOTRE TOUR DE POSER LES QUESTIONS</span><h2>La conversation <small>{comments.length}</small></h2><form className="comment-form" onSubmit={postComment}><span className="comment-avatar">{user?.first_name?.[0] || <UserRound size={17}/>}</span><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={user ? "Posez une question au vendeur…" : "Connectez-vous pour poser une question…"}/><button className="button button-dark" disabled={busy}>Envoyer <ArrowUpRight size={14}/></button></form>{notice && <p className="inline-notice">{notice}</p>}
        {comments.length ? comments.map((item) => <article className="comment" key={item.id}><span className="comment-avatar">{item.user?.first_name?.[0] || <UserRound size={16}/>}</span><div><b>{[item.user?.first_name, item.user?.last_name].filter(Boolean).join(" ") || "Visiteur AutoMoto"}</b><time>{new Date(item.created_at).toLocaleDateString("fr-FR")}</time><p>{item.content}</p></div></article>) : <p className="muted"><MessageCircle size={15}/> Aucune question. Lancez la conversation.</p>}
      </section></div>
      <aside className="detail-aside"><div className="price-card"><span className="eyebrow">PRIX AFFICHÉ</span><strong>{formatPrice(vehicle.price, vehicle.currency)}</strong><small>Prix communiqué par le concessionnaire</small>{dealer.phone ? <a className="button button-lime button-wide" href={`tel:${dealer.phone}`}><Phone size={15}/> Contacter le vendeur</a> : <a className="button button-lime button-wide" href="#questions"><MessageCircle size={15}/> Poser une question</a>}<button className="button button-outline button-wide" onClick={share}><Share2 size={15}/> Partager l’annonce</button><div className="seller-info"><ShieldCheck size={18}/><span>Vendeur professionnel<br/><strong>{dealer.business_name || "Concessionnaire AutoMoto"}</strong></span></div></div><div className="seller-card"><span className="seller-avatar">{(dealer.business_name || "A").slice(0,1)}</span><span className="eyebrow">CONCESSIONNAIRE</span><h3>{dealer.business_name || "Vendeur AutoMoto"}</h3><p><MapPin size={14}/>{dealer.city || vehicle.city}, {dealer.country || vehicle.country}</p>{dealer.phone && <a href={`tel:${dealer.phone}`}>{dealer.phone} <ArrowUpRight size={14}/></a>}</div></aside>
    </div>
  </main>;
}
