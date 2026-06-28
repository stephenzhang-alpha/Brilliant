import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the auth store so the form renders without touching Firebase. The factory
// returns a stable object whose `error` we can flip per-test.
const mockState = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  clearError: vi.fn(),
  error: null as string | null,
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: () => mockState,
}));

import { LoginForm } from '../LoginForm';

function renderForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockState.error = null;
    mockState.signIn.mockReset();
    mockState.signInWithGoogle.mockReset();
    mockState.clearError.mockReset();
  });

  it('associates each label with its input (accessible by label text)', () => {
    renderForm();
    // getByLabelText only succeeds when htmlFor/id wire the label to the field.
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
  });

  it('exposes a "Forgot password?" link to the reset page', () => {
    renderForm();
    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toHaveAttribute('href', '/reset');
  });

  it('renders the dismiss control as a non-submitting button', () => {
    mockState.error = 'That email and password don\'t match. Give it another try!';
    renderForm();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/don't match/i);

    const dismiss = screen.getByRole('button', { name: /dismiss/i });
    // Must be type=button so dismissing the error does NOT resubmit the form.
    expect(dismiss).toHaveAttribute('type', 'button');
  });

  it('keeps the Google provider button out of the submit flow', () => {
    renderForm();
    const google = screen.getByRole('button', { name: /continue with google/i });
    expect(google).toHaveAttribute('type', 'button');
  });
});
