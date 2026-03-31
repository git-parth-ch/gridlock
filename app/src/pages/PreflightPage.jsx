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
    <div className="min-h-screen bg-elite-bg flex flex-col items-center justify-center p-8 font-inter">
      <div className="max-w-xl w-full bg-elite-card border-[1px] border-gray-800 p-10 relative">
        <h1 className="text-4xl font-oswald text-gray-200 text-center tracking-widest mb-1">
          INITIATE_PROTOCOL
        </h1>
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-[1px] bg-elite-red"></div>
          <span className="text-[10px] text-elite-textMuted uppercase tracking-widest font-bold">PRE-FLIGHT CHECKLIST // SECTOR_01</span>
          <div className="w-8 h-[1px] bg-elite-red"></div>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-10">
          {CHECKS.map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-4 p-4 border-[1px] transition-all duration-200 text-left cursor-pointer
                ${checked[item.id]
                  ? 'border-elite-red bg-elite-red/5'
                  : 'border-gray-800 bg-[#151515] hover:border-gray-600'
                }`}
            >
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center border-[1px] shrink-0 transition-colors
                ${checked[item.id] ? 'bg-elite-red border-elite-red' : 'border-gray-600'}`}>
                {checked[item.id] && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                  </svg>
                )}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${checked[item.id] ? 'text-white' : 'text-elite-textMuted'}`}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Proceed button */}
        <button
          disabled={!allDone}
          onClick={() => setSessionStatus('login')}
          className={`w-full py-4 text-sm font-bold tracking-[0.2em] uppercase border-[1px] transition-all
            ${allDone
              ? 'bg-white text-black border-white hover:bg-gray-200 cursor-pointer'
              : 'bg-transparent text-gray-600 border-gray-700 cursor-not-allowed opacity-50'
            }`}
        >
          ACKNOWLEDGE_AND_PROCEED
        </button>
      </div>
    </div>
  );
}