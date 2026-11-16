import { useState } from "react";
import { ArrowLeft, ArrowRight, CarFront, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const initial = { email: "", password: "", first_name: "", last_name: "", phone: "", business_name: "", city: "", country: "", address: "", registration_number: "", website: "", description: "" };
export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const isDealer = mode === "dealer";
  const [values, setValues] = useState(initial);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  function change(e) { setValues((v) => ({ ...v, [e.target.name]: e.target.value })); }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (isLogin) await login(values.email, values.password);
      else {
        const payload = { ...values };
        if (!isDealer) for (const key of ["business_name","city","country","address","registration_number","website","description"]) delete payload[key];
        await apiRequest(isDealer ? "/auth/register/dealer/" : "/auth/register/", { method: "POST", body: payload });
        await login(values.email, values.password);
      }
      navigate(location.state?.from || (isDealer ? "/espace-concessionnaire" : "/annonces"), { replace: true });
    } catch (e) {
      const field = e.data && typeof e.data === "object" ? Object.entries(e.data).find(([, v]) => v) : null;
      setError(field ? `${field[0]} : ${Array.isArray(field[1]) ? field[1][0] : field[1]}` : e.message);
    } finally { setBusy(false); }
  }
  const title = isLogin ? "Ravi de vous revoir." : isDealer ? "Rejoignez le réseau." : "Créons votre compte.";
  return <main className="auth-page"><section className="auth-visual"><Link to="/" className="brand brand-light"><span className="brand-icon"><CarFront/></span><span>auto<span>moto</span></span></Link><div><span className="eyebrow light">LE NEUF, EN MOUVEMENT</span><h1>{isLogin ? <>Bon retour<br/>sur la route.</> : isDealer ? <>Votre stock,<br/>sous son meilleur jour.</> : <>La suite de votre<br/>histoire commence.</>}</h1><p>Retrouvez des véhicules neufs auprès de professionnels vérifiés.</p></div><span className="auth-foot"><ShieldCheck size={16}/> Une expérience pensée pour avancer en confiance</span></section>
    <section className="auth-panel"><div className="auth-wrap"><Link to="/" className="back-link"><ArrowLeft size={15}/> Retour à l’accueil</Link><span className="eyebrow">{isDealer ? "ESPACE PROFESSIONNEL" : "VOTRE ESPACE AUTOMOTO"}</span><h2>{title}</h2><p>{isLogin ? "Connectez-vous pour reprendre là où vous en étiez." : isDealer ? "Créez votre profil de concessionnaire. Il sera vérifié avant de publier." : "Enregistrez-vous pour échanger avec les vendeurs."}</p>
      <form className="auth-form" onSubmit={submit}>
        {!isLogin && <>{isDealer && <label>Nom du concessionnaire *<input name="business_name" value={values.business_name} onChange={change} required/></label>}<div className="form-row"><label>Prénom<input name="first_name" value={values.first_name} onChange={change}/></label><label>Nom<input name="last_name" value={values.last_name} onChange={change}/></label></div></>}
        <label>Adresse e-mail *<input type="email" name="email" value={values.email} onChange={change} required autoComplete="email" placeholder="vous@exemple.com"/></label>
        {!isLogin && <label>Téléphone<input type="tel" name="phone" value={values.phone} onChange={change}/></label>}
        {isDealer && <><div className="form-row"><label>Ville *<input name="city" value={values.city} onChange={change} required/></label><label>Pays *<input name="country" value={values.country} onChange={change} required/></label></div><label>Adresse professionnelle<input name="address" value={values.address} onChange={change}/></label><label>Numéro d’immatriculation<input name="registration_number" value={values.registration_number} onChange={change}/></label><label>Site internet<input type="url" name="website" value={values.website} onChange={change} placeholder="https://"/></label><label>Présentation<textarea name="description" rows="3" value={values.description} onChange={change}/></label></>}
        <label>Mot de passe *<span className="password-field"><input type={visible ? "text" : "password"} name="password" value={values.password} onChange={change} required minLength="8" autoComplete={isLogin ? "current-password" : "new-password"}/><button type="button" onClick={() => setVisible(!visible)} aria-label="Afficher ou masquer le mot de passe">{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        {isDealer && <div className="approval-note"><ShieldCheck size={17}/>Votre profil sera soumis à validation avant d’accéder à la publication.</div>}
        <button className="button button-lime button-wide" disabled={busy}>{busy ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte"} <ArrowRight size={16}/></button>
      </form><div className="auth-switch">{isLogin ? <>Pas encore de compte ? <Link to="/inscription">Créer un compte</Link></> : <>Déjà inscrit ? <Link to="/connexion">Se connecter</Link></>}</div>{!isLogin && !isDealer && <div className="auth-switch">Concessionnaire ? <Link to="/inscription-concessionnaire">Créer un compte professionnel</Link></div>}</div></section>
  </main>;
}
