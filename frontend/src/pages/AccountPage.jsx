import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, LogOut, Save, Star, UserRound, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage, formatDate, formatPrice } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorState, LoadingState, SuccessMessage } from "../components/StatusMessage.jsx";

const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

function statusLabel(status) {
  return ({ pending: "En attente", confirmed: "Confirmé", rejected: "Refusé", cancelled: "Annulé", expired: "Expiré" })[status] || status;
}

export default function AccountPage() {
  const { user, updateProfile, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState({ first_name: user?.first_name || "", last_name: user?.last_name || "", phone_number: user?.phone_number || "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/bookings/?page_size=100");
      setBookings(response.results.filter((booking) => booking.guest_id === user.id));
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]);

  async function saveProfile(event) {
    event.preventDefault();
    setBusy("profile");
    setError("");
    setSuccess("");
    try {
      await updateProfile(profile);
      setSuccess("Votre profil a été mis à jour.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  }

  async function cancel(booking) {
    setBusy(String(booking.id));
    setError("");
    try {
      await api.post(`/bookings/${booking.id}/cancel/`, {});
      await load();
      setSuccess("La réservation a été annulée.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  }

  async function submitReview(event, booking) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(`review-${booking.id}`);
    setError("");
    try {
      await api.post(`/properties/${booking.property.id}/reviews/`, {
        booking: booking.id,
        rating: Number(formData.get("rating")),
        comment: formData.get("comment"),
      });
      await load();
      setSuccess("Merci, votre avis vérifié a été publié.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  }

  return <div className="account-page page-shell">
    <div className="account-heading"><div><span className="eyebrow"><i /> VOTRE ESPACE MOBILA</span><h1>Bonjour{user.first_name ? `, ${user.first_name}` : ""}.<br /><em>Vous êtes chez vous.</em></h1><p>Retrouvez vos séjours, vos demandes et vos informations personnelles.</p></div><Link className="button button-outline" to="/hote">Espace hôte <ArrowRight size={15} /></Link></div>
    {error && <ErrorState message={error} onRetry={load} />}{success && <SuccessMessage>{success}</SuccessMessage>}
    <div className="account-grid">
      <section className="account-panel profile-panel"><div className="panel-heading"><span><UserRound size={18} /></span><div><h2>Mon profil</h2><p>Vos informations personnelles.</p></div></div>
        <form className="profile-form" onSubmit={saveProfile}><label className="form-label">Prénom<input value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} maxLength="150" required /></label><label className="form-label">Nom<input value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} maxLength="150" required /></label><label className="form-label form-span-2">Adresse e-mail<input value={user.email} readOnly /></label><label className="form-label form-span-2">Téléphone<input type="tel" value={profile.phone_number} onChange={(event) => setProfile({ ...profile, phone_number: event.target.value })} maxLength="32" placeholder="Facultatif" /></label><button className="button button-dark" disabled={busy === "profile"}><Save size={15} /> Enregistrer le profil</button></form>
        <button className="logout-link" onClick={logout}><LogOut size={15} /> Se déconnecter</button>
      </section>
      <section className="account-panel stays-panel"><div className="panel-heading"><span><CalendarCheck2 size={18} /></span><div><h2>Mes séjours</h2><p>Demandes et réservations confirmées.</p></div><strong className="panel-count">{bookings.length}</strong></div>
        {loading ? <LoadingState label="Chargement de vos séjours…" /> : bookings.length ? <div className="booking-list">{bookings.map((booking) => {
          const canReview = booking.status === "confirmed" && booking.check_out <= todayIso && !booking.has_review;
          const canCancel = ["pending", "confirmed"].includes(booking.status) && booking.check_in > todayIso;
          return <article className="booking-item" key={booking.id}>
            <div className="booking-item-top"><div><Link to={`/logements/${booking.property.id}`}><h3>{booking.property.title}</h3></Link><p>{booking.property.city}, {booking.property.country}</p></div><span className={`booking-status status-${booking.status}`}><i />{statusLabel(booking.status)}</span></div>
            <div className="booking-dates"><span><small>ARRIVÉE</small>{formatDate(booking.check_in)}</span><span className="date-divider">→</span><span><small>DÉPART</small>{formatDate(booking.check_out)}</span><strong>{formatPrice(booking.total_price)}</strong></div>
            {booking.host_message && <p className="host-response"><strong>Message de l’hôte :</strong> {booking.host_message}</p>}
            {booking.status === "pending" && <p className="pending-note"><Clock3 size={14} /> Votre demande bloque les dates pendant 24 h, en attente de la réponse de l’hôte.</p>}
            {canCancel && <button className="cancel-booking" disabled={busy === String(booking.id)} onClick={() => cancel(booking)}><XCircle size={14} /> Annuler cette réservation</button>}
            {booking.has_review && <p className="review-done"><CheckCircle2 size={14} /> Votre avis est publié</p>}
            {canReview && <form className="review-form" onSubmit={(event) => submitReview(event, booking)}><label className="form-label">Votre note<select name="rating" defaultValue="5"><option value="5">5 — Exceptionnel</option><option value="4">4 — Très bien</option><option value="3">3 — Bien</option><option value="2">2 — Décevant</option><option value="1">1 — Mauvais</option></select></label><label className="form-label">Votre avis<textarea name="comment" rows="3" maxLength="2000" placeholder="Racontez votre expérience…" /></label><button className="button button-outline button-small" disabled={busy === `review-${booking.id}`}><Star size={14} /> Publier mon avis</button></form>}
          </article>;
        })}</div> : <div className="empty-account"><span><CalendarCheck2 size={21} /></span><h3>Votre prochain séjour vous attend.</h3><p>Explorez des lieux qui ont une âme et une histoire à partager.</p><Link className="button button-outline" to="/logements">Découvrir les logements <ArrowRight size={15} /></Link></div>}
      </section>
    </div>
  </div>;
}
