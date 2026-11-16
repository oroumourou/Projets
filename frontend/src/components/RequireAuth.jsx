import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "./StatusMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingState label="Vérification de votre session…" />;
  return user ? children : <Navigate to="/connexion" replace state={{ from: location }} />;
}
