import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { LiveProvider } from './context/LiveContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { PageLoader } from './components/ui/Spinner.jsx';
import LoginPage from './pages/LoginPage.jsx';

// Pages are code-split so the login screen loads instantly.
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ServicesPage = lazy(() => import('./pages/ServicesPage.jsx'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage.jsx'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage.jsx'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage.jsx'));
const AgentPage = lazy(() => import('./pages/AgentPage.jsx'));
const PlaybooksPage = lazy(() => import('./pages/PlaybooksPage.jsx'));
const ChaosLabPage = lazy(() => import('./pages/ChaosLabPage.jsx'));
const LogsPage = lazy(() => import('./pages/LogsPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const AuditPage = lazy(() => import('./pages/AuditPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

const page = (Component, role) => (
  <ProtectedRoute role={role}>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </ProtectedRoute>
);

export default function App() {
  const { user } = useAuth();
  return (
    <LiveProvider enabled={Boolean(user)}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={page(DashboardPage)} />
          <Route path="services" element={page(ServicesPage)} />
          <Route path="services/:id" element={page(ServiceDetailPage)} />
          <Route path="incidents" element={page(IncidentsPage)} />
          <Route path="incidents/:id" element={page(IncidentDetailPage)} />
          <Route path="agent" element={page(AgentPage)} />
          <Route path="playbooks" element={page(PlaybooksPage)} />
          <Route path="chaos" element={page(ChaosLabPage)} />
          <Route path="logs" element={page(LogsPage)} />
          <Route path="reports" element={page(ReportsPage)} />
          <Route path="users" element={page(UsersPage, 'admin')} />
          <Route path="audit" element={page(AuditPage, 'admin')} />
          <Route path="settings" element={page(SettingsPage, 'admin')} />
          <Route path="profile" element={page(ProfilePage)} />
          <Route path="about" element={page(AboutPage)} />
          <Route path="*" element={page(NotFoundPage)} />
        </Route>
      </Routes>
    </LiveProvider>
  );
}
