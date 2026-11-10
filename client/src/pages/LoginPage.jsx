import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiCpu, FiLock, FiMail, FiShield, FiTool } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/Field.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { DEMO_ACCOUNTS } from '../utils/constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid e-mail address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero" aria-hidden="false">
        <div className="row">
          <div className="brand-logo" aria-hidden>
            <FiShield size={20} />
          </div>
          <strong style={{ fontSize: 18 }}>AegisHeal</strong>
        </div>
        <div>
          <h1>Agentic AI that keeps your software running — on its own.</h1>
          <p>
            AegisHeal continuously monitors your services, detects failures, analyses logs with an AI agent, performs the right recovery action and
            verifies the fix. Every incident is recorded so the agent learns.
          </p>
        </div>
        <div className="hero-steps">
          {[
            [FiActivity, 'Monitor health'],
            [FiAlertTriangle, 'Detect failures'],
            [FiCpu, 'AI root-cause analysis'],
            [FiTool, 'Automated recovery'],
            [FiCheckCircle, 'Verify & learn'],
            [FiShield, 'Guardrails & approvals'],
          ].map(([Icon, label]) => (
            <div className="hero-step" key={label}>
              <Icon aria-hidden /> {label}
            </div>
          ))}
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card stack" onSubmit={submit} noValidate>
          <div>
            <h2>Welcome back</h2>
            <p className="muted">Sign in to the self-healing control center.</p>
          </div>
          {serverError && (
            <div className="alert alert-danger" role="alert">
              <FiLock aria-hidden /> {serverError}
            </div>
          )}
          <Field label="E-mail" error={errors.email}>
            {(a11y) => (
              <div className="input-icon">
                <FiMail aria-hidden />
                <input {...a11y} className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoFocus />
              </div>
            )}
          </Field>
          <Field label="Password" error={errors.password}>
            {(a11y) => (
              <div className="input-icon">
                <FiLock aria-hidden />
                <input {...a11y} className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} />
              </div>
            )}
          </Field>
          <Button type="submit" size="lg" block loading={busy}>
            Sign in
          </Button>
          <div className="demo-accounts">
            <strong>Demo accounts</strong> <span className="muted">(created by <code>npm run seed</code>)</span>
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.email} className="spread">
                <span>
                  {a.role}: <code>{a.email}</code>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
