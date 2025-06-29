import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import emptyStateSvg from '../../assets/SVG/emptyState.svg';

export function Login() {
  const { login, error, clearError, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    await login(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950">
      <div className="bg-stone-950 p-8 rounded-lg w-full max-w-md">
      <div className="flex justify-center mb-4">
          <img 
            src={emptyStateSvg} 
            alt="Empty State" 
            className="h-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-teal-500 mb-6 text-center">SLUMNET</h2>
        
        {error && (
          <div className="bg-red-900 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-stone-300 mb-2 font-mono text-sm" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="w-full p-2 rounded bg-stone-800 text-white border border-stone-600 focus:border-teal-500 focus:outline-none font-mono text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-stone-300 mb-2 font-mono text-sm" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full p-2 rounded bg-stone-800 text-white border border-stone-600 focus:border-teal-500 focus:outline-none font-mono text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-mono text-sm py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-stone-400 text-sm font-mono">
            You're not ready for the Hyperwar
          </p>
        </div>
      </div>
    </div>
  );
}
