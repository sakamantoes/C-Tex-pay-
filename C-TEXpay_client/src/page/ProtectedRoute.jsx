import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { getDashboardPath } from "../utils/role";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user?.role;
    const roleArray = Array.isArray(user?.roles) ? user.roles : [];
    const hasAccess =
      allowedRoles.includes(userRole) || roleArray.some((role) => allowedRoles.includes(role));

    if (!hasAccess) {
      const fallbackPath = user?.role ? getDashboardPath(user) : "/login";
      return <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />;
    }
  }

  return children;
};

export default ProtectedRoute;
