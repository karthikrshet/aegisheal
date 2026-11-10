import { useState } from 'react';
import { FiKey, FiTrash2, FiUserPlus } from 'react-icons/fi';
import { PageHeader, Card, Button, Badge, Modal, Field, ConfirmDialog, ErrorState, PageLoader, Toggle } from '../components/ui/index.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usersApi } from '../api/endpoints.js';
import { humanize, timeAgo } from '../utils/format.js';

const ROLES = ['viewer', 'operator', 'admin'];
const ROLE_TONE = { admin: 'violet', operator: 'blue', viewer: 'gray' };
const EMPTY = { name: '', email: '', password: '', role: 'viewer' };

function validate(form, { requirePassword = true } = {}) {
  const e = {};
  if (form.name !== undefined && form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (form.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid e-mail';
  if (requirePassword) {
    if ((form.password || '').length < 8) e.password = 'At least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Must contain a letter and a number';
  }
  return e;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => usersApi.list(), []);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const save = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await usersApi.create({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast.success('User created', form.email);
      setForm(null);
      reload({ silent: true });
    } catch (err) {
      setErrors({ server: err.message });
    } finally {
      setBusy(false);
    }
  };

  const update = async (u, patch, msg) => {
    try {
      await usersApi.update(u.id, patch);
      toast.success(msg);
      reload({ silent: true });
    } catch (err) {
      toast.error('Update failed', err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Viewers can watch, operators can run recoveries and chaos tests, admins manage everything."
        actions={
          <Button icon={FiUserPlus} onClick={() => { setForm({ ...EMPTY }); setErrors({}); }}>
            Add user
          </Button>
        }
      />
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Active</th>
                <th>Last sign-in</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {u.name} {self && <Badge tone="blue">You</Badge>}
                      </div>
                      <div className="small muted">{u.email}</div>
                    </td>
                    <td>
                      {self ? (
                        <Badge tone={ROLE_TONE[u.role]}>{humanize(u.role)}</Badge>
                      ) : (
                        <select className="select" style={{ width: 130 }} value={u.role} onChange={(e) => update(u, { role: e.target.value }, `Role changed to ${e.target.value}`)} aria-label={`Role for ${u.email}`}>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {humanize(r)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <Toggle checked={u.active} disabled={self} onChange={(v) => update(u, { active: v }, v ? 'User enabled' : 'User disabled')} label={u.active ? 'Active' : 'Disabled'} id={`active-${u.id}`} />
                    </td>
                    <td className="small muted">{timeAgo(u.lastLoginAt)}</td>
                    <td className="right">
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" icon={FiKey} onClick={() => { setResetFor(u); setNewPassword(''); }} aria-label={`Reset password for ${u.email}`} />
                        <Button size="sm" variant="ghost" icon={FiTrash2} disabled={self} onClick={() => setToDelete(u)} aria-label={`Delete ${u.email}`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!form}
        title="Add user"
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" loading={busy}>
              Create user
            </Button>
          </>
        }
      >
        {form && (
          <form id="user-form" className="stack" onSubmit={save} noValidate>
            {errors.server && <div className="alert alert-danger">{errors.server}</div>}
            <Field label="Full name" error={errors.name}>
              {(a) => <input {...a} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />}
            </Field>
            <Field label="E-mail" error={errors.email}>
              {(a) => <input {...a} className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} />}
            </Field>
            <Field label="Temporary password" hint="Min. 8 characters with a letter and a number" error={errors.password}>
              {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} maxLength={128} />}
            </Field>
            <Field label="Role">
              {(a) => (
                <select {...a} className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {humanize(r)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!resetFor}
        title={`Reset password for ${resetFor?.email}`}
        confirmLabel="Set password"
        onCancel={() => setResetFor(null)}
        onConfirm={async () => {
          const errs = validate({ password: newPassword });
          if (errs.password) return toast.error('Weak password', errs.password);
          try {
            await usersApi.resetPassword(resetFor.id, newPassword);
            toast.success('Password reset', 'The user will need to sign in again.');
            setResetFor(null);
          } catch (err) {
            toast.error('Reset failed', err.message);
          }
        }}
      >
        <Field label="New password" hint="Min. 8 characters with a letter and a number">
          {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} maxLength={128} />}
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete user?"
        message={`${toDelete?.email} will lose access immediately. This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await usersApi.remove(toDelete.id);
            toast.success('User deleted');
            setToDelete(null);
            reload({ silent: true });
          } catch (err) {
            toast.error('Delete failed', err.message);
          }
        }}
      />
    </>
  );
}
