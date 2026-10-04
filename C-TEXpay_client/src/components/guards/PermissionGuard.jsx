import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";

/*
|--------------------------------------------------------------------------
| PermissionGuard
|--------------------------------------------------------------------------
| Wraps a route element and:
|   1. Ensures membership data is loaded (roles + permissions)
|   2. Redirects to /dashboard if the user lacks the required permission
|
| Usage:
|   <PermissionGuard permission="customers.read">
|     <CustomersPage />
|   </PermissionGuard>
|
| Or with multiple (ANY):
|   <PermissionGuard anyOf={["customers.read", "customers.create"]}>
|     ...
|   </PermissionGuard>
|
| Or with multiple (ALL):
|   <PermissionGuard allOf={["team.read", "team.manage"]}>
|     ...
|   </PermissionGuard>
|--------------------------------------------------------------------------
*/

export default function PermissionGuard({
  permission,
  anyOf,
  allOf,
  fallback = "/merchant/dashboard",
  children,
}) {
  const location = useLocation();

  const {
    permissions,
    membership,
    isLoading,
    getMyMembership,
  } = useMerchantStore();

  /*
  |--------------------------------------------------------------------------
  | Ensure membership is loaded
  |--------------------------------------------------------------------------
  | If someone deep-links to a protected page, permissions may not be loaded.
  */
  useEffect(() => {
    if (!membership && !isLoading) {
      getMyMembership();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  |--------------------------------------------------------------------------
  | While loading membership → hold render
  |--------------------------------------------------------------------------
  */
  if (!membership && isLoading) {
    return <GuardFallback />;
  }

  /*
  |--------------------------------------------------------------------------
  | If still no membership after load → kick to dashboard
  |--------------------------------------------------------------------------
  */
  if (!membership) {
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  /*
  |--------------------------------------------------------------------------
  | Permission checks
  |--------------------------------------------------------------------------
  */
  const singleOk = permission ? hasPermission(permissions, permission) : true;

  const anyOk =
    Array.isArray(anyOf) && anyOf.length > 0
      ? anyOf.some((p) => hasPermission(permissions, p))
      : true;

  const allOk =
    Array.isArray(allOf) && allOf.length > 0
      ? allOf.every((p) => hasPermission(permissions, p))
      : true;

  if (!singleOk || !anyOk || !allOk) {
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  return children;
}

/*
|--------------------------------------------------------------------------
| Minimal full-page fallback while permissions load
|--------------------------------------------------------------------------
*/
function GuardFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctex-bg">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ctex-blue/30 border-t-ctex-blue" />
        <span className="text-xs text-ctex-text-muted">
          Checking permissions…
        </span>
      </div>
    </div>
  );
}