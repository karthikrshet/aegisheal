import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { PageHeader, Card, Button, Field, Badge } from '../components/ui/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { authApi } from '../api/endpoints.js';
import { formatDateTime, humanize } from '../utils/format.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.current) errs.current = 'Enter your current password';
    if (form.next.length < 8) errs.next = 'At least 8 characters';
    else if (!/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) errs.next = 'Must contain a letter and a number';
    if (form.next !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await authApi.changePassword(form.current, form.next);
      toast.success('Password changed', 'Other sessions have been signed out.');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setErrors({ server: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Your profile" />
      <div className="grid grid-2">
        <Card title="Account">
          <dl className="kv">
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
            <dt>Role</dt>
            <dd>
              <Badge tone="blue">{humanize(user.role)}</Badge>
            </dd>
            <dt>Member since</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </dl>
        </Card>
        <Card title="Change password">
          <form className="stack" onSubmit={submit} noValidate>
            {errors.server && <div className="alert alert-danger">{errors.server}</div>}
            <Field label="Current password" error={errors.current}>
              {(a) => <input {...a} className="input" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} maxLength={128} />}
            </Field>
            <Field label="New password" hint="Min. 8 characters with a letter and a number" error={errors.next}>
              {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} maxLength={128} />}
            </Field>
            <Field label="Confirm new password" error={errors.confirm}>
              {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} maxLength={128} />}
            </Field>
            <div>
              <Button type="submit" icon={FiLock} loading={busy}>
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
