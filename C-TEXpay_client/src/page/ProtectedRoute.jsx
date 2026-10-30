import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../src/store/auth.store.js";
import { FullScreenLoader } from "../../src/components/Spin.jsx";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { initialized, isAuthenticated, user, verificationRequired } =
    useAuthStore();
  const location = useLocation();

  if (!initialized) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (verificationRequired) {
    return <Navigate to="/verify-email-sent" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}