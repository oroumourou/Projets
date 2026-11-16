import { ArrowRight, ChevronDown, Home, ImagePlus, Plus, ShieldCheck, Sparkles, Upload, Video, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage, formatPrice } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PropertyCard from "../components/PropertyCard.jsx";
import { ErrorState, LoadingState, SuccessMessage } from "../components/StatusMessage.jsx";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.m4v";
const emptyForm = { title: "", description: "", property_type: "apartment", address: "", city: "", country: "France", postal_code: "", nightly_price: "", max_guests: 2, bedrooms: 1, bathrooms: 1, amenities: "", status: "draft" };

export default function HostPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [listingResponse, bookingResponse] = await Promise.all([api.get("/properties/?page_size=100"), api.get("/bookings/?page_size=100")]);
      setProperties(listingResponse.results.filter((item) => item.is_owner));
      setBookings(bookingResponse.results.filter((item) => item.property.owner_id === user.id && ["pending", "confirmed"].includes(item.status)));
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function createListing(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        nightly_price: Number(form.nightly_price).toFixed(2),
        max_guests: Number(form.max_guests),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        amenities: form.amenities.split(",").map((item) => item.trim()).filter(Boolean),
      };
      if (editingId) {
        const updated = await api.patch(`/properties/${editingId}/`, payload);
        let uploaded = 0;
        let issue = "";
        for (const [index, file] of files.entries()) {
          const body = new FormData();
          body.append("file", file);
          body.append("alt_text", file.name);
          body.append("sort_order", String(updated.media?.length + index || index));
          try {
            await api.post(`/properties/${editingId}/media/`, body);
            uploaded += 1;
          } catch (uploadError) {
            issue = apiErrorMessage(uploadError);
            break;
          }
        }
        setSuccess(`Annonce mise à jour${uploaded ? ` avec ${uploaded} média${uploaded > 1 ? "s" : ""}` : ""}.`);
        setEditingId(null);
        setForm(emptyForm);
        setFiles([]);
        setFormOpen(false);
        await load();
        if (issue) setError(`L’annonce est modifiée, mais l’envoi des médias a échoué : ${issue}`);
        return;
      }
      const created = await api.post("/properties/", payload);
      let uploaded = 0;
      let issue = "";
      for (const [index, file] of files.entries()) {
        const body = new FormData();
        body.append("file", file);
        body.append("alt_text", file.name);
        body.append("sort_order", String(index));
        try {
          await api.post(`/properties/${created.id}/media/`, body);
          uploaded += 1;
        } catch (uploadError) {
          issue = apiErrorMessage(uploadError);
          break;
        }
      }
      setForm(emptyForm);
      setFiles([]);
      setFormOpen(false);
      await load();
      setSuccess(`Annonce créée${uploaded ? ` avec ${uploaded} média${uploaded > 1 ? "s" : ""}` : ""}.`);
      if (issue) setError(`L’annonce est créée, mais l’envoi des médias a échoué : ${issue}`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function editListing(property) {
    try {
      const details = await api.get(`/properties/${property.id}/`);
      setForm({
        title: details.title,
        description: details.description,
        property_type: details.property_type,
        address: details.address || "",
        city: details.city,
        country: details.country,
        postal_code: details.postal_code || "",
        nightly_price: details.nightly_price,
        max_guests: details.max_guests,
        bedrooms: details.bedrooms,
        bathrooms: details.bathrooms,
        amenities: (details.amenities || []).join(", "),
        status: details.status,
      });
      setEditingId(property.id);
      setFormOpen(true);
      setError("");
      document.querySelector(".host-listings-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFiles([]);
  }

  async function uploadMedia(property, selectedFiles) {
    const uploads = Array.from(selectedFiles).slice(0, 5);
    if (!uploads.length) return;
    setUploadingId(property.id);
    setError("");
    let uploaded = 0;
    let issue = "";
    for (const [index, file] of uploads.entries()) {
      const body = new FormData();
      body.append("file", file);
      body.append("alt_text", file.name);
      body.append("sort_order", String(property.media.length + index));
      try {
        await api.post(`/properties/${property.id}/media/`, body);
        uploaded += 1;
      } catch (uploadError) {
        issue = apiErrorMessage(uploadError);
        break;
      }
    }
    await load();
    setUploadingId(null);
    if (issue) setError(`${uploaded} média envoyé(s). L’envoi suivant a échoué : ${issue}`);
    else setSuccess(`${uploaded} média${uploaded > 1 ? "s" : ""} ajouté${uploaded > 1 ? "s" : ""} à « ${property.title} ».`);
  }

  async function deleteMedia(property, media) {
    if (!window.confirm("Supprimer définitivement ce média ?")) return;
    try {
      await api.delete(`/properties/${property.id}/media/${media.id}/`);
      await load();
      setSuccess("Média supprimé.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  async function changeStatus(property) {
    const status = property.status === "published" ? "archived" : "published";
    try {
      await api.patch(`/properties/${property.id}/`, { status });
      await load();
      setSuccess(status === "published" ? "Votre annonce est maintenant publiée." : "Votre annonce est archivée.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  async function decide(booking, decision) {
    try {
      await api.post(`/bookings/${booking.id}/decision/`, { decision });
      await load();
      setSuccess(decision === "confirm" ? "Séjour confirmé." : "Demande refusée.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  async function hostCancel(booking) {
    if (!window.confirm("Annuler ce séjour ? Le voyageur verra le changement dans son compte.")) return;
    try {
      await api.post(`/bookings/${booking.id}/host-cancel/`, {});
      await load();
      setSuccess("Le séjour a été annulé.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  if (!user) return <div className="host-landing"><div className="host-landing-image" /><div className="host-landing-copy"><span className="eyebrow"><i /> L’ESPACE HÔTE MOBILA</span><h1>Votre maison a<br />une histoire.<br /><em>Partagez-la.</em></h1><p>Rencontrez des voyageurs qui cherchent plus qu’un toit. Vous gardez la main sur votre annonce et vos réservations.</p><Link className="button button-dark" to="/inscription">Créer mon espace hôte <ArrowRight size={17} /></Link><span className="host-login-note">Déjà membre ? <Link to="/connexion">Connectez-vous</Link></span></div></div>;

  return <div className="host-page page-shell">
    <div className="host-page-heading"><div><span className="eyebrow"><i /> LE CARNET DES HÔTES</span><h1>Un lieu à partager.<br /><em>Une belle histoire à écrire.</em></h1><p>Présentez votre logement aux voyageurs qui lui ressemblent.</p></div><div className="host-heading-ornament"><Sparkles size={25} /><span>MOBILA<br />HÔTES</span></div></div>
    <div className="host-benefits"><div><ShieldCheck size={19} /><span><strong>Vous gardez la main</strong><small>Sur vos annonces et réservations</small></span></div><div><ImagePlus size={19} /><span><strong>Votre lieu, vos images</strong><small>Partagez photos et vidéos</small></span></div><div><Video size={19} /><span><strong>Une communauté choisie</strong><small>Des voyageurs respectueux</small></span></div></div>
    {error && <ErrorState message={error} onRetry={load} />}{success && <SuccessMessage>{success}</SuccessMessage>}
    {bookings.length > 0 && <section className="host-inbox"><div className="section-heading"><div><span className="eyebrow"><i /> SÉJOURS À SUIVRE</span><h2>Demandes et <em>réservations.</em></h2></div><span className="inbox-count">{bookings.length}</span></div><div className="host-booking-list">{bookings.map((booking) => <article className="host-booking-row" key={booking.id}><div><strong>{booking.property.title}</strong><span>{booking.check_in} → {booking.check_out} · {booking.guests} voyageur{booking.guests > 1 ? "s" : ""}</span><small>{formatPrice(booking.total_price)} · {booking.status === "pending" ? "réponse souhaitée sous 24 h" : "séjour confirmé"}</small></div><div>{booking.status === "pending" ? <><button className="button button-dark button-small" onClick={() => decide(booking, "confirm")}>Confirmer</button><button className="text-button" onClick={() => decide(booking, "reject")}>Refuser</button></> : <button className="text-button" onClick={() => hostCancel(booking)}>Annuler le séjour</button>}</div></article>)}</div></section>}
    <div className="host-listings-heading"><div><span className="eyebrow"><i /> VOS ADRESSES</span><h2>Vos annonces <em>Mobila.</em></h2></div><button className="button button-dark" onClick={() => setFormOpen((open) => !open)}><Plus size={17} /> Ajouter une annonce</button></div>
    {formOpen && <form className="listing-form" onSubmit={createListing}><div className="form-card-heading"><div><span className="eyebrow"><i /> {editingId ? "MODIFIER L’ANNONCE" : "NOUVELLE ADRESSE"}</span><h2>Racontez-nous <em>ce lieu.</em></h2></div><button className="icon-button" type="button" onClick={closeForm} aria-label="Fermer"><ChevronDown size={18} /></button></div>
      <div className="form-grid">
        <label className="form-label form-span-2">Nom de l’annonce<input name="title" value={form.title} onChange={update} placeholder="La maison au bord des pins" maxLength="180" required /></label>
        <label className="form-label form-span-2">Votre description<textarea name="description" value={form.description} onChange={update} rows="4" maxLength="10000" placeholder="Racontez ce qui rend cet endroit unique…" required /></label>
        <label className="form-label">Type de logement<select name="property_type" value={form.property_type} onChange={update}><option value="apartment">Appartement</option><option value="house">Maison</option><option value="studio">Studio</option><option value="room">Chambre</option></select></label>
        <label className="form-label">Prix par nuit (€)<input name="nightly_price" type="number" min="1" step="0.01" value={form.nightly_price} onChange={update} required /></label>
        <label className="form-label form-span-2">Adresse complète <small className="field-note">Cette adresse n’est jamais affichée publiquement.</small><input name="address" value={form.address} onChange={update} required /></label>
        <label className="form-label">Ville<input name="city" value={form.city} onChange={update} required /></label>
        <label className="form-label">Code postal<input name="postal_code" value={form.postal_code} onChange={update} required /></label>
        <label className="form-label">Pays<input name="country" value={form.country} onChange={update} required /></label>
        <label className="form-label">Voyageurs<input name="max_guests" type="number" min="1" max="100" value={form.max_guests} onChange={update} required /></label>
        <label className="form-label">Chambres<input name="bedrooms" type="number" min="0" max="99" value={form.bedrooms} onChange={update} required /></label>
        <label className="form-label">Salles de bain<input name="bathrooms" type="number" min="0" step="0.5" value={form.bathrooms} onChange={update} required /></label>
        <label className="form-label form-span-2">Équipements <small className="field-note">Séparez les éléments par une virgule.</small><input name="amenities" value={form.amenities} onChange={update} placeholder="Wi-Fi, terrasse, cuisine équipée" /></label>
        <label className="form-label form-span-2">Visibilité<select name="status" value={form.status} onChange={update}><option value="draft">Brouillon — visible uniquement par vous</option><option value="published">Publier maintenant</option></select></label>
        <label className="form-label form-span-2">Photos et vidéos <small className="field-note">5 fichiers par envoi; 15 Mio/image, 150 Mio/vidéo; 30 médias par logement.</small><span className="upload-field"><Upload size={19} /><span>{files.length ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}` : "Choisir vos médias"}<input type="file" accept={ACCEPTED_MEDIA} multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /></span></span></label>
      </div><div className="form-actions"><span>Les annonces en brouillon ne sont visibles que par vous.</span><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Création en cours…" : "Créer mon annonce"} <ArrowRight size={16} /></button></div>
    </form>}
    <section className="host-listings">
      {loading ? <LoadingState label="Chargement de vos annonces…" /> : properties.length ? <div className="property-grid">{properties.map((property) => <div className="owned-property" key={property.id}><PropertyCard property={property} /><div className="host-property-controls"><span className={`status-chip status-${property.status}`}><i />{property.status === "published" ? "En ligne" : property.status === "draft" ? "Brouillon" : "Archivé"}</span><button className="text-button" onClick={() => editListing(property)}>Modifier</button><button className="text-button" onClick={() => changeStatus(property)}>{property.status === "published" ? "Archiver" : "Publier"}</button><label className={`button button-outline button-small media-upload-button ${uploadingId === property.id ? "is-uploading" : ""}`}><Upload size={14} /> {uploadingId === property.id ? "Envoi…" : "Ajouter médias"}<input type="file" accept={ACCEPTED_MEDIA} multiple disabled={uploadingId === property.id} onChange={(event) => { uploadMedia(property, event.target.files); event.target.value = ""; }} /></label></div>
          {property.media?.length > 0 && <div className="manage-media">{property.media.map((media) => <div key={media.id} className="manage-media-item">{media.kind === "video" ? <video src={media.url} muted /> : <img src={media.url} alt={media.alt_text || ""} />}<button onClick={() => deleteMedia(property, media)} aria-label="Supprimer le média"><X size={14} /></button></div>)}</div>}
        </div>)}</div> : <div className="empty-account"><span><Home size={22} /></span><h3>Votre première adresse vous attend.</h3><p>Créez une annonce pour partager votre logement avec les voyageurs Mobila.</p><button className="button button-outline" onClick={() => setFormOpen(true)}><Plus size={16} /> Créer ma première annonce</button></div>}
    </section>
  </div>;
}
