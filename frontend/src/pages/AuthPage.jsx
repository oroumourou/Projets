import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (isRegister && form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register({ first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password });
      } else {
        await login(form.email, form.password);
      }
      navigate(location.state?.from?.pathname || "/compte", { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-page">
    <div className="auth-visual"><div className="auth-photo" /><Link className="auth-back" to="/"><ArrowLeft size={15} /> Retour à l’accueil</Link><div className="auth-visual-copy"><span className="eyebrow eyebrow-light"><i /> UN AUTRE GOÛT DU VOYAGE</span><h2>Les plus beaux souvenirs commencent <em>quelque part.</em></h2><span className="auth-caption">LA MAISON DU CAP · CÔTE D’AZUR</span></div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow"><i /> BIENVENUE CHEZ MOBILA</span><h1>{isRegister ? <>Votre prochaine histoire <em>commence.</em></> : <>Ravi de vous <em>retrouver.</em></>}</h1><p>{isRegister ? "Créez votre espace pour découvrir et réserver des lieux singuliers." : "Connectez-vous pour retrouver vos séjours et vos adresses favorites."}</p>
      <form className="auth-form" onSubmit={submit}>
        {isRegister && <div className="form-grid form-grid-two"><label className="form-label">Prénom<input autoComplete="given-name" name="first_name" value={form.first_name} onChange={update} maxLength="150" required /></label><label className="form-label">Nom<input autoComplete="family-name" name="last_name" value={form.last_name} onChange={update} maxLength="150" required /></label></div>}
        <label className="form-label">Adresse e-mail<span className="input-icon"><Mail size={16} /><input autoComplete="email" name="email" type="email" value={form.email} onChange={update} placeholder="vous@exemple.fr" required /></span></label>
        <label className="form-label">Mot de passe<span className="input-icon"><KeyRound size={16} /><input autoComplete={isRegister ? "new-password" : "current-password"} name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} minLength={isRegister ? 12 : 1} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>{isRegister && <small className="field-note">12 caractères minimum. Un mot de passe unique est recommandé.</small>}</label>
        {isRegister && <label className="form-label">Confirmer le mot de passe<input autoComplete="new-password" name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={update} minLength="12" required /></label>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? "Veuillez patienter…" : isRegister ? "Créer mon compte" : "Me connecter"} <ArrowRight size={16} /></button>
      </form>
      <p className="auth-switch">{isRegister ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"} <Link to={isRegister ? "/connexion" : "/inscription"}>{isRegister ? "Se connecter" : "Créer un compte"}</Link></p>
      <div className="auth-privacy"><ShieldCheck size={16} /><span>Vos informations restent privées et protégées.</span></div>
    </div></div>
  </div>;
}
