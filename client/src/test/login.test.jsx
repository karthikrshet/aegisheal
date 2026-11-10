import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

function mockFetch(handler) {
  globalThis.fetch = vi.fn(async (url, init) => {
    const { status, body } = handler(url, init);
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  });
}

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('validates the form before calling the API', async () => {
    mockFetch(() => ({ status: 401, body: { error: { message: 'no session' } } }));
    renderLogin();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid e-mail address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(fetch.mock.calls.filter(([u]) => u.includes('/auth/login'))).toHaveLength(0);
  });

  it('shows the server error for wrong credentials', async () => {
    mockFetch((url) =>
      url.includes('/auth/login') ? { status: 401, body: { error: { message: 'Invalid e-mail or password' } } } : { status: 401, body: { error: { message: 'no session' } } },
    );
    renderLogin();
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid e-mail or password');
  });

  it('fills demo credentials with the Use button', async () => {
    mockFetch(() => ({ status: 401, body: { error: { message: 'no session' } } }));
    renderLogin();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Use' }))[0]);
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toHaveValue('admin@aegisheal.local'));
  });
});
