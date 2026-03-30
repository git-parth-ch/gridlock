// admin/src/pages/TeamDetail.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
function api(method, path, data) {
  return axios({ method, url: `${BACKEND}${path}`, data,
    headers: { 'x-admin-password': sessionStorage.getItem('admin_pw') }
  });
}

const SEV_COLOR = {
  INFO:    'text-blue-400 bg-blue-950/40',
  WARNING: 'text-yellow-400 bg-yellow-950/40',
  FLAG:    'text-red-400 bg-red-950/40',
};

export default function TeamDetail({
  teamCode, onBack, onUnfreeze, onFreeze, onDisqualify, onMessage, onLogout
}) {
  const [violations, setViolations] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('get', `/api/admin/violations/${teamCode}`)
      .then(r => setViolations(r.data));
  }, [teamCode]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    onMessage(teamCode, msg.trim());
    setMsg('');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-black border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Back
        </button>
        <span className="text-gray-700">|</span>
        <h2 className="text-white font-bold font-mono">{teamCode}</h2>
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Controls</h3>
          <div className="flex flex-wrap gap-3">
            <Btn color="green"  onClick={() => onUnfreeze(teamCode, true)}   label="🔓 Unfreeze (reset count)" />
            <Btn color="yellow" onClick={() => onUnfreeze(teamCode, false)}  label="⚠️ Unfreeze (keep count)" />
            <Btn color="red"    onClick={() => onFreeze(teamCode)}           label="🔒 Freeze" />
            <Btn color="gray"   onClick={() => onDisqualify(teamCode)}       label="🚫 Disqualify" />
            <Btn color="gray"   onClick={() => onLogout?.(teamCode)}        label="⏏ Log out device" />
          </div>
        </div>

        {/* Message */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">📡 Push Message to Team</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Message shown on all team devices…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-gray-500"
            />
            <button
              onClick={sendMsg}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Send
            </button>
          </div>
        </div>

        {/* Violation log */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">
            Violation Log ({violations.length})
          </h3>
          {violations.length === 0 ? (
            <p className="text-gray-600 text-sm">No violations recorded.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {violations.map(v => (
                <div key={v.id} className={`flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm ${SEV_COLOR[v.severity]}`}>
                  <span className="font-mono text-xs opacity-60">
                    {new Date(v.occurred_at).toLocaleTimeString()}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded border border-current opacity-80">{v.severity}</span>
                  <span className="font-medium">{v.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs opacity-50 ml-auto font-mono">{v.device_id?.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Btn({ color, onClick, label }) {
  const c = {
    green:  'border-green-800 text-green-400 hover:bg-green-900/40',
    yellow: 'border-yellow-800 text-yellow-400 hover:bg-yellow-900/40',
    red:    'border-red-800 text-red-400 hover:bg-red-900/40',
    gray:   'border-gray-700 text-gray-400 hover:bg-gray-800',
  };
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${c[color]}`}>
      {label}
    </button>
  );
}