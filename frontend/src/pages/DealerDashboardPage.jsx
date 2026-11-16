import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Bike, CarFront, ClipboardList, Eye, Heart, MapPin, MessageCircle, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, assetUrl, unwrapPage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatPrice } from "../components/VehicleCard.jsx";
import { LoadingState, PageError } from "../components/PageStates.jsx";

const blank = { vehicle_type: "car", title: "", description: "", make: "", model: "", trim: "", year: new Date().getFullYear(), price: "", currency: "EUR", mileage_km: 0, fuel_type: "", transmission: "", engine_displacement_cc: "", power_hp: "", exterior_color: "", body_style: "", doors: "", seats: "", drivetrain: "", stock_number: "", country: "", city: "", status: "draft" };

function Editor({ vehicle, close, saved }) {
  const [values, setValues] = useState({ ...blank, ...(vehicle || {}) });
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function change(e) { setValues((v) => ({ ...v, [e.target.name]: e.target.value })); }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    const body = { ...values, mileage_km: 0, year: Number(values.year), price: Number(values.price) };
    for (const key of ["engine_displacement_cc","power_hp","doors","seats"]) body[key] = body[key] === "" ? null : Number(body[key]);
    try {
      const item = await apiRequest(vehicle ? `/vehicles/${vehicle.id}/` : "/vehicles/", { method: vehicle ? "PATCH" : "POST", body });
      if (image && !vehicle) { const form = new FormData(); form.append("vehicle", String(item.id)); form.append("image", image); await apiRequest("/vehicle-images/", { method: "POST", body: form }); }
      saved();
    } catch (e) {
      const first = e.data && typeof e.data === "object" ? Object.entries(e.data).find(([, v]) => v) : null;
      setError(first ? `${first[0]} : ${Array.isArray(first[1]) ? first[1][0] : first[1]}` : e.message);
    } finally { setBusy(false); }
  }
  const fields = [["make","Marque *"],["model","Modèle *"],["trim","Finition"],["year","Année *","number"],["price","Prix *","number"],["currency","Devise"],["country","Pays *"],["city","Ville *"],["stock_number","Référence stock"],["fuel_type","Énergie"],["transmission","Transmission"],["power_hp","Puissance (ch)","number"],["engine_displacement_cc","Cylindrée (cm³)","number"],["exterior_color","Couleur"],["body_style","Carrosserie"],...(values.vehicle_type === "car" ? [["doors","Portes","number"],["seats","Places","number"]] : []),["drivetrain","Transmission intégrale"]];
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><section className="editor" role="dialog" aria-modal="true"><header><div><span className="eyebrow">{vehicle ? "MODIFIER VOTRE ANNONCE" : "NOUVELLE ANNONCE"}</span><h2>{vehicle ? "Modifier le véhicule" : "Ajouter un véhicule"}</h2></div><button className="icon-button" onClick={close} aria-label="Fermer"><X/></button></header>
    <form onSubmit={submit}><div className="editor-grid">
      <label>Type<select name="vehicle_type" value={values.vehicle_type} onChange={change}><option value="car">Voiture</option><option value="motorcycle">Moto</option></select></label>
      <label className="span-two">Titre de l’annonce *<input name="title" value={values.title} onChange={change} required/></label>
      {fields.map(([name, label, type]) => name === "currency" ? <label key={name}>{label}<select name={name} value={values[name]} onChange={change}><option>EUR</option><option>XOF</option><option>USD</option></select></label> : <label key={name}>{label}<input type={type || "text"} name={name} value={values[name] ?? ""} onChange={change} required={label.includes("*")} min={type === "number" ? 0 : undefined}/></label>)}
      <label className="span-two">Description *<textarea name="description" rows="4" value={values.description} onChange={change} required/></label>
      {!vehicle && <label className="upload-field span-two"><ImagePlus size={19}/><span><b>Ajouter une photo</b><small>{image?.name || "Image facultative — JPG, PNG ou WEBP"}</small></span><input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)}/></label>}
    </div>{error && <div className="form-error">{error}</div>}<div className="editor-actions"><button type="button" className="button button-outline" onClick={close}>Annuler</button><button className="button button-lime" disabled={busy}>{busy ? "Enregistrement…" : vehicle ? "Enregistrer" : "Créer le brouillon"} <ArrowUpRight size={15}/></button></div></form>
  </section></div>;
}

export default function DealerDashboardPage() {
  const { user, dealerProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(undefined);
  const [tab, setTab] = useState("all");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError("");
    try {
      const [dashboard, inventory] = await Promise.all([apiRequest("/dealer/dashboard/"), apiRequest(`/vehicles/?dealer=${user.id}&ordering=-created_at`)]);
      setStats(dashboard); setVehicles(unwrapPage(inventory));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user?.id]);
  useEffect(() => { refresh(); }, [refresh]);
  async function action(vehicle, operation) {
    try {
      if (operation === "delete") {
        if (!window.confirm(`Supprimer « ${vehicle.title} » ?`)) return;
        await apiRequest(`/vehicles/${vehicle.id}/`, { method: "DELETE" });
      } else if (operation === "sold") await apiRequest(`/vehicles/${vehicle.id}/`, { method: "PATCH", body: { status: "sold" } });
      else await apiRequest(`/vehicles/${vehicle.id}/${operation}/`, { method: "POST" });
      await refresh();
    } catch (e) { setNotice(e.message); }
  }
  if (loading && !stats) return <main className="container"><LoadingState label="Ouverture de votre espace…"/></main>;
  if (error && !stats) return <main className="container"><PageError message={error} onRetry={refresh}/></main>;
  const approved = dealerProfile?.status === "approved";
  const counts = stats?.vehicles || {};
  const rows = tab === "all" ? vehicles : vehicles.filter((v) => v.status === tab);
  const tabs = [["all","Tous",vehicles.length],["published","En ligne",counts.published],["draft","Brouillons",counts.drafts],["sold","Vendus",counts.sold]];
  return <main className="dashboard-page"><div className="container">
    <div className="dashboard-head"><div><div className="breadcrumbs"><Link to="/">Accueil</Link> / Mon espace</div><span className="eyebrow">ESPACE CONCESSIONNAIRE</span><h1>Bonjour{user?.first_name ? `, ${user.first_name}` : ""}<span>.</span></h1><p>Votre activité, vos annonces, tout au même endroit.</p></div><button className="button button-lime" disabled={!approved} onClick={() => setEditor(null)}><Plus size={16}/> Ajouter un véhicule</button></div>
    {!approved && <div className="approval"><ShieldCheck/><div><b>Votre compte est en cours de vérification</b><p>Vous pourrez gérer et publier vos annonces après approbation par notre équipe.</p></div><span>{dealerProfile?.status === "rejected" ? "À vérifier" : "En attente"}</span></div>}
    {notice && <div className="inline-notice">{notice}<button onClick={() => setNotice("")}>Fermer</button></div>}
    {error && <PageError message={error} onRetry={refresh}/>}
    <div className="stats-grid"><article><ClipboardList/><span>Véhicules au total</span><b>{counts.total || 0}</b><small>Dans votre inventaire</small></article><article><Eye/><span>Annonces en ligne</span><b>{counts.published || 0}</b><small>Visibles aux acheteurs</small></article><article><Heart/><span>Favoris reçus</span><b>{stats?.engagement?.likes || 0}</b><small>Sur vos annonces</small></article><article><MessageCircle/><span>Questions reçues</span><b>{stats?.engagement?.comments || 0}</b><small>Des acheteurs</small></article></div>
    <section className="inventory"><header><div><span className="eyebrow">VOTRE VITRINE AUTOMOTO</span><h2>Mon inventaire</h2></div><button className="icon-button" onClick={refresh} aria-label="Actualiser"><RefreshCw size={17}/></button></header><nav className="inventory-tabs">{tabs.map(([key,label,count]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}<span>{count || 0}</span></button>)}</nav>
      {loading ? <LoadingState label="Actualisation…"/> : rows.length ? rows.map((v) => <article className="inventory-row" key={v.id}><div className="inventory-image">{v.images?.[0]?.image ? <img src={assetUrl(v.images[0].image)} alt=""/> : v.vehicle_type === "motorcycle" ? <Bike/> : <CarFront/>}</div><div className="inventory-info"><b>{v.title}</b><p>{v.make} {v.model} · {v.year} · <MapPin size={13}/> {v.city}</p><span className={`status status-${v.status}`}>{v.status === "published" ? "En ligne" : v.status === "draft" ? "Brouillon" : v.status === "sold" ? "Vendu" : "Archivé"}</span></div><strong>{formatPrice(v.price,v.currency)}</strong><div className="row-actions">{v.status === "published" && <Link className="icon-button" to={`/vehicules/${v.id}`} aria-label="Voir"><Eye size={16}/></Link>}<button className="icon-button" onClick={() => setEditor(v)} aria-label="Modifier"><Pencil size={16}/></button>{v.status === "draft" && <button className="icon-button" onClick={() => action(v,"publish")} aria-label="Publier"><ArrowUpRight size={16}/></button>}{v.status === "published" && <button className="icon-button" onClick={() => action(v,"archive")} aria-label="Archiver"><X size={16}/></button>}<button className="icon-button delete-action" onClick={() => action(v,"delete")} aria-label="Supprimer"><Trash2 size={16}/></button>{v.status === "published" && <button className="icon-button" onClick={() => action(v,"sold")} aria-label="Marquer vendu">✓</button>}</div></article>) : <div className="inventory-empty"><span><CarFront/></span><h3>{tab === "all" ? "Votre vitrine est prête" : "Rien à afficher ici"}</h3><p>Ajoutez votre premier véhicule neuf pour le présenter aux acheteurs.</p>{tab === "all" && <button className="button button-dark" disabled={!approved} onClick={() => setEditor(null)}><Plus size={15}/> Créer une annonce</button>}</div>}
    </section>
    <div className="help-note"><ShieldCheck size={18}/><span><b>Votre vitrine est publique.</b><br/>Les annonces en ligne sont visibles par les acheteurs.</span><Link to="/annonces">Voir les annonces <ArrowUpRight size={14}/></Link></div>
  </div>{editor !== undefined && approved && <Editor vehicle={editor} close={() => setEditor(undefined)} saved={() => { setEditor(undefined); setNotice("Annonce enregistrée."); refresh(); }}/>}</main>;
}
