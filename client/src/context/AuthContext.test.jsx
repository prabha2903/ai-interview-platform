import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// authService is mocked wholesale — AuthContext's job is to manage state
// around these calls (loading/user/error), not to make real HTTP requests,
// so the network layer (cookies, axios, interceptors) is out of scope here
// and already covered by the server-side auth tests.
vi.mock('../services/authService', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  getMe: vi.fn(),
  logoutUser: vi.fn(),
  logoutAllSessions: vi.fn(),
}));

vi.mock('../services/userService', () => ({
  updateProfile: vi.fn(),
}));

import { loginUser, registerUser, getMe, logoutUser, logoutAllSessions } from '../services/authService';

// A minimal consumer that exposes useAuth()'s state/actions as clickable
// buttons + rendered text, so tests can drive and observe the context
// through the DOM the way a real component would.
const Probe = () => {
  const { user, loading, error, isAuthenticated, login, register, logout, logoutEverywhere } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user-email">{user?.email || ''}</div>
      <div data-testid="error">{error || ''}</div>
      <button onClick={() => login('jane@example.com', 'secret123').catch(() => {})}>login</button>
      <button onClick={() => register('Jane', 'jane@example.com', 'secret123').catch(() => {})}>
        register
      </button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => logoutEverywhere()}>logout-everywhere</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in a loading state, then resolves to unauthenticated when getMe fails (no session cookie)', async () => {
    getMe.mockRejectedValue({ response: { status: 401 } });

    renderWithProvider();

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('resolves to authenticated when a valid session cookie already exists', async () => {
    getMe.mockResolvedValue({ user: { email: 'jane@example.com' } });

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));
    expect(screen.getByTestId('user-email').textContent).toBe('jane@example.com');
  });

  it('logs in successfully and updates state', async () => {
    getMe.mockRejectedValue({ response: { status: 401 } });
    loginUser.mockResolvedValue({ user: { email: 'jane@example.com' } });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-email').textContent).toBe('jane@example.com');
  });

  it('surfaces a login error from the server without crashing', async () => {
    getMe.mockRejectedValue({ response: { status: 401 } });
    loginUser.mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('Invalid email or password');
  });

  it('registers successfully and updates state', async () => {
    getMe.mockRejectedValue({ response: { status: 401 } });
    registerUser.mockResolvedValue({ user: { email: 'jane@example.com' } });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('register').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('logs out and clears user state even if the server call fails', async () => {
    getMe.mockResolvedValue({ user: { email: 'jane@example.com' } });
    logoutUser.mockRejectedValue(new Error('network error'));

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('');
  });

  it('logs out of all sessions and clears user state', async () => {
    getMe.mockResolvedValue({ user: { email: 'jane@example.com' } });
    logoutAllSessions.mockResolvedValue({ success: true });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

    await act(async () => {
      screen.getByText('logout-everywhere').click();
    });

    expect(logoutAllSessions).toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});
