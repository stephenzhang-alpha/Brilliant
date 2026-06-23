import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/course');
    } catch {
      // error is set in store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-lg p-3">
              {error}
              <button onClick={clearError} className="ml-2 underline">Dismiss</button>
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
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-text-muted mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary-light hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
