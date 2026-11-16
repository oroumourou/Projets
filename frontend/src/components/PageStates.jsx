import { AlertCircle, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Chargement…" }) { return <div className="loading"><span className="spinner"/>{label}</div>; }
export function PageError({ message, onRetry }) {
  return <div className="error-box" role="alert"><AlertCircle/><div><strong>Impossible de charger cette page</strong><p>{message}</p>{onRetry && <button className="text-link" onClick={onRetry}>Réessayer <RefreshCw size={14}/></button>}</div></div>;
}
