// app/src/pages/PreflightPage.jsx
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';

const CHECKS = [
  { id: 'dnd',     label: 'Do Not Disturb is enabled on this device' },
  { id: 'phone',   label: 'Phone is face-down and set to silent' },
  { id: 'wifi',    label: 'Connected to event WiFi only' },
  { id: 'apps',    label: 'All other applications are closed' },
];

export default function PreflightPage() {
  const [checked, setChecked] = useState({});
  const setSessionStatus = useStore(s => s.setSessionStatus);

  useEffect(() => {
    // Enable DND automatically
    window.electronAPI?.enableDND();
  }, []);

  const toggle = (id) => setChecked(c => ({ ...c, [id]: !c[id] }));
  const allDone = CHECKS.every(c => checked[c.id]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white tracking-widest mb-2">GRIDLOCK</h1>
          <p className="text-gray-400 text-sm uppercase tracking-widest">Pre-flight Checklist</p>
        </div>

        {/* Checklist */}
        <div className="space-y-4 mb-10">
          {CHECKS.map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left
                ${checked[item.id]
                  ? 'border-green-500 bg-green-900/20 text-green-400'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0
                ${checked[item.id] ? 'border-green-500 bg-green-500' : 'border-gray-600'}`}>
                {checked[item.id] && (
                  <svg className="w-3 h-3 text-black" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Proceed button */}
        <button
          disabled={!allDone}
          onClick={() => setSessionStatus('login')}
          className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200
            ${allDone
              ? 'bg-white text-black hover:bg-gray-200 cursor-pointer'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
        >
          I understand — Enter Team Code
        </button>
      </div>
    </div>
  );
}