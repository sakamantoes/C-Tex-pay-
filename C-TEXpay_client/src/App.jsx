import { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LandingPage from "./page/LandingPage.jsx";
import LoginPage from "./page/LoginPage.jsx";
import RegisterPage from "./page/RegisterPage.jsx";
import ProtectedRoute from "./page/ProtectedRoute.jsx";

import MerchantDashboard from "./page/MerchantDashboard/MerchantDashboard.jsx";
import AdminDashboard from "./page/AdminDashboard/AdminDashboard.jsx";
import PlatformFeesPage from "./page/AdminDashboard/PlatformFeesPage.jsx";
import PlatformTransactionsPage from "./page/AdminDashboard/PlatformTransactionsPage.jsx";
import SuperAdminDashboard from "./page/SuperAdminDashboard/SuperAdminDashboard.jsx";

import { useAuthStore } from "./store/auth.store";
import { getDashboardPath, ROLES } from "./utils/role.js";
import { FullScreenLoader } from "./components/Spin.jsx";

import VerifyEmailPage from "./page/VerifyEmailPage.jsx";
import VerifyEmailSentPage from "./page/VerifyEmailSentPage.jsx";
import ForgotPasswordPage from "./page/ForgotPasswordPage";
import ResetPasswordPage from "./page/ResetPasswordPage";
import ChangePasswordPage from "./page/ChangePasswordPage";
import AcceptInvitationPage from "./page/AcceptInvitationPage.jsx";

import UserDashboard from "./page/UserDashboard/UserDashboard.jsx";
import OverviewPage from "./page/UserDashboard/OverviewPage.jsx";
import ProfilePage from "./page/UserDashboard/ProfilePage.jsx";
import NotificationsPage from "./page/UserDashboard/NotificationsPage.jsx";
import CreateBusinessPage from "./page/UserDashboard/CreateBusinessPage.jsx";

import CustomersPage from "./page/MerchantDashboard/CustomersPage.jsx";
import TeamMembersPage from "./page/MerchantDashboard/TeamMembersPage.jsx";
import RolesPage from "./page/MerchantDashboard/RolesPage.jsx";
import ApiKeysPage from "./page/MerchantDashboard/ApiKeysPage.jsx";
import TransactionsPage from "./page/MerchantDashboard/TransactionsPage.jsx";
import MerchantWebhooksPage from "./page/MerchantDashboard/MerchantWebhooksPage.jsx";
import MerchantSettingsPage from "./page/MerchantDashboard/MerchantSettingsPage.jsx";
import MerchantNotificationsPage from "./page/MerchantDashboard/MerchantNotificationsPage.jsx";

import PermissionGuard from "./components/guards/PermissionGuard.jsx";

// Aliased imports — two different BusinessProfilePage files
import MerchantBusinessProfilePage from "./page/MerchantDashboard/BusinessProfilePage.jsx";
import UserBusinessProfilePage from "./page/UserDashboard/BusinessProfilePage.jsx";

/*
|--------------------------------------------------------------------------
| PUBLIC PATHS — never blocked by the verification guard
|--------------------------------------------------------------------------
| These are the paths a user can visit without being forced into the
| email-verification flow. Includes all auth + landing pages.
|--------------------------------------------------------------------------
*/
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/verify-email-sent",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
];

const MERCHANT_WORKSPACE_ROLES = [ROLES.USER, ROLES.MERCHANT];

const isPublicPath = (pathname) =>
  PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

const DashboardRouter = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === ROLES.USER) {
    return <Navigate to="/user/dashboard/overview" replace />;
  }

  return <Navigate to={getDashboardPath(user)} replace />;
};

const AppRoutes = () => {
  const {
    initialized,
    getMe,
    verificationRequired,
    verificationEmail,
  } = useAuthStore();
  const location = useLocation();
  const hasBootstrappedSession = useRef(false);

  useEffect(() => {
    if (hasBootstrappedSession.current) return;
    hasBootstrappedSession.current = true;
    getMe();
  }, [getMe]);

  if (!initialized) {
    return <FullScreenLoader />;
  }

  /*
  |--------------------------------------------------------------------------
  | Verification guard
  |--------------------------------------------------------------------------
  | Only enforce the flow when the user tries to reach a PROTECTED page.
  | Public pages (home, login, signup, etc.) are always reachable so the
  | user is never trapped inside the verification flow.
  |--------------------------------------------------------------------------
  */
  if (verificationRequired && !isPublicPath(location.pathname)) {
    const email = verificationEmail
      ? `?email=${encodeURIComponent(verificationEmail)}`
      : "";
    return <Navigate to={`/verify-email-sent${email}`} replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<RegisterPage />} />

      {/* /dashboard — route dispatcher by role */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.USER,
              ROLES.MERCHANT,
              ROLES.ADMIN,
              ROLES.SUPER_ADMIN,
            ]}
          >
            <DashboardRouter />
          </ProtectedRoute>
        }
      />

      {/* USER DASHBOARD (nested) */}
      <Route
        path="/user/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.USER]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="create-business" element={<CreateBusinessPage />} />
        <Route path="business" element={<UserBusinessProfilePage />} />
      </Route>

      {/* AUTH FLOW */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify-email-sent" element={<VerifyEmailSentPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.USER,
              ROLES.MERCHANT,
              ROLES.ADMIN,
              ROLES.SUPER_ADMIN,
            ]}
          >
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* MERCHANT DASHBOARD */}
      <Route
        path="/merchant/dashboard"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard fallback="/user/dashboard/overview">
              <MerchantDashboard />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/customers"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="customers.read">
              <CustomersPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/transactions"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="transactions.read">
              <TransactionsPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/webhooks"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="webhooks.read">
              <MerchantWebhooksPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/settings"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="settings.read">
              <MerchantSettingsPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/notifications"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard fallback="/user/dashboard/overview">
              <MerchantNotificationsPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/business"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="merchants.read">
              <MerchantBusinessProfilePage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/api-keys"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="api_keys.read">
              <ApiKeysPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/team"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="team.read">
              <TeamMembersPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/dashboard/roles"
        element={
          <ProtectedRoute allowedRoles={MERCHANT_WORKSPACE_ROLES}>
            <PermissionGuard permission="roles.read">
              <RolesPage />
            </PermissionGuard>
          </ProtectedRoute>
        }
      />

      {/* ADMIN + SUPER ADMIN */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/fees"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <PlatformFeesPage basePath="/admin" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <PlatformTransactionsPage platformRole="ADMIN" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/fees"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
            <PlatformFeesPage basePath="/super-admin" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/transactions"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
            <PlatformTransactionsPage platformRole="SUPER_ADMIN" />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
          </div>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Router>
  );
};

export default App;