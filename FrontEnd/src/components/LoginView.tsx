import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AiinaLogo from './layout/AiinaLogo';

export default function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white border border-[#c5c5d3] rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <AiinaLogo size="lg" />
          <p className="text-sm text-[#757682] mt-2">QC Inspection System</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#444651] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-[#c5c5d3] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
              placeholder="you@aiina.co.id"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#444651] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-[#c5c5d3] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-[#ba1a1a] bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#757682] mt-6">
          PT Alpha Innovatech Indonesia - AIINA QC System
        </p>
      </div>
    </div>
  );
}
