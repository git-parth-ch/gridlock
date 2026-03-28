// admin/src/pages/AdminLogin.jsx
import { useState } from 'react';

export default function AdminLogin({ onAuth }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  const login = () => {
    if (!pw.trim()) return;
    sessionStorage.setItem('admin_pw', pw.trim());
    // Actual validation happens on first API call — 401 will log out
    onAuth();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-1 tracking-widest">GRIDLOCK</h1>
        <p className="text-gray-500 text-center text-xs uppercase tracking-widest mb-10">Admin Dashboard</p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Admin password"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm
                     focus:outline-none focus:border-gray-500 mb-4"
          autoFocus
        />
        {err && <p className="text-red-400 text-sm text-center mb-4">{err}</p>}
        <button
          onClick={login}
          className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200"
        >
          Enter
        </button>
      </div>
    </div>
  );
}