import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Chargement…" }) {
  return <div className="state-card" role="status"><LoaderCircle className="spin" size={22} /> <span>{label}</span></div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="state-card state-error" role="alert"><AlertCircle size={20} /><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}>Réessayer</button>}</div>;
}

export function SuccessMessage({ children }) {
  return <div className="state-card state-success" role="status"><CheckCircle2 size={20} /><span>{children}</span></div>;
}

export function InlineNotice({ children }) {
  return <p className="inline-notice">{children}</p>;
}
