import { Navigate, useLocation } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import { can } from '../../utils/permissions.js';
import { PageLoader } from '../ui/Spinner.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

/** Redirects to /login when signed out; shows a friendly notice when the role is too low. */
export function ProtectedRoute({ role, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <PageLoader label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && !can(user, role)) {
    return (
      <EmptyState icon={FiLock} title="Restricted area">
        This page requires the {role} role. Ask an administrator for access.
      </EmptyState>
    );
  }
  return children;
}
