import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password);
      navigate('/course');
    } catch {
      // error is set in store
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-lg p-3">
              {displayError}
              <button onClick={() => { clearError(); setLocalError(''); }} className="ml-2 underline">Dismiss</button>
            </div>
          )}
          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary-light transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary-light transition-colors"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary-light transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-text-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-light hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
