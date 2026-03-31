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
    <div className="min-h-screen bg-gradient-to-b from-[#b36a22] via-[#d4d1a5] to-[#7db1b1] flex items-center justify-center p-8 font-inter">
      <div className="w-full max-w-sm bg-[#f8f5df] border-[6px] border-black p-8 shadow-[8px_8px_0_black] -rotate-1 skew-x-[-1deg] relative">
        <h1 className="text-5xl font-bangers text-[#d82a1a] text-center mb-1 tracking-widest italic" style={{WebkitTextStroke: '1px black', textShadow: '2px 2px 0 black'}}>
          RANGER COMMAND
        </h1>
        <div className="bg-black text-white text-center font-bangers text-xl px-2 mb-8 border-2 border-black inline-block relative left-1/2 -translate-x-1/2 shadow-[2px_2px_0_#d82a1a] skew-x-[5deg]">
          ADMIN LOGIN
        </div>
        
        <div className="relative z-10">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Enter security code"
            className="w-full bg-white border-4 border-black px-4 py-3 text-black text-sm font-bold tracking-widest uppercase shadow-[2px_2px_0_black] focus:outline-none focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0_black] transition-all mb-4"
            autoFocus
          />
          {err && <p className="text-red-600 font-bold tracking-widest text-sm text-center mb-4 uppercase bg-white border-2 border-red-600 px-2">{err}</p>}
          <button
            onClick={login}
            className="w-full py-3 bg-[#e4ba26] text-black border-4 border-black font-bangers text-2xl tracking-widest uppercase hover:bg-yellow-400 shadow-[4px_4px_0_black] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0_black] transition-all"
          >
            AUTHORIZE
          </button>
        </div>
      </div>
    </div>
  );
}