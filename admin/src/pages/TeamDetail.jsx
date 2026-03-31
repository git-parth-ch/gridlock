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
  const [questionTimes, setQuestionTimes] = useState([]);

  useEffect(() => {
    api('get', `/api/admin/violations/${teamCode}`)
      .then(r => setViolations(r.data));
  }, [teamCode]);

  useEffect(() => {
    api('get', `/api/admin/question-times/${teamCode}`)
      .then(r => setQuestionTimes(r.data))
      .catch(() => setQuestionTimes([]));
  }, [teamCode]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    onMessage(teamCode, msg.trim());
    setMsg('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-inter text-gray-200">
      <header className="bg-[#111] border-b-[2px] border-[#333] px-8 py-6 flex items-center gap-4 relative z-20">
        <button onClick={onBack} className="bg-transparent text-elite-red px-3 py-1 font-bold tracking-widest text-xs border-[2px] border-elite-red hover:bg-[#b0101f] hover:text-white hover:border-[#b0101f] transition-all uppercase">
          ← RETURN
        </button>
        <div className="h-6 w-[2px] bg-gray-700"></div>
        <h2 className="text-white font-oswald text-4xl tracking-widest leading-none">
          {teamCode.replace('GRIDLOCK-', 'TEAM_')}
        </h2>
      </header>

      <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Controls */}
        <div className="bg-[#151515] border-[2px] border-[#333] p-6">
          <h3 className="text-white font-oswald text-2xl tracking-widest mb-6 inline-block border-b-[2px] border-elite-red pr-8 pb-1">COMMAND_MODULE</h3>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => onUnfreeze(teamCode, true)}   label="UNFREEZE (RESET)" />
            <Btn onClick={() => onUnfreeze(teamCode, false)}  label="UNFREEZE (KEEP)" />
            <Btn onClick={() => onFreeze(teamCode)}           label="FREEZE TEAM" />
            <Btn onClick={() => onDisqualify(teamCode)}       label="SUSPEND TEAM" />
            <Btn onClick={() => onLogout?.(teamCode)}        label="LOGOUT DEVICE" />
          </div>
        </div>

        {/* Question times */}
        {/* Question times */}
        <div className="bg-[#151515] border-[2px] border-[#333] p-6">
          <h3 className="text-white font-oswald text-2xl tracking-widest mb-6 inline-block border-b-[2px] border-[#3b82f6] pr-8 pb-1">MISSION_LOG</h3>
          {(!questionTimes || questionTimes.length === 0) ? (
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No completed missions.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto border-[1px] border-[#333] bg-[#0a0a0a]">
              <div className="grid grid-cols-[60px_1fr_120px] bg-[#111] px-4 py-3 font-mono text-[10px] text-gray-400 tracking-widest uppercase border-b-[1px] border-[#333]">
                <span>RNK</span>
                <span>MISSION_ID</span>
                <span>SYS_TIME</span>
              </div>
              {questionTimes.map((q) => (
                <div key={q.questionId} className="grid grid-cols-[60px_1fr_120px] px-4 py-3 border-b-[1px] border-[#222] text-xs font-mono items-center hover:bg-[#1a1a1a]">
                  <span className="text-elite-red font-bold">{String(q.displayOrder).padStart(2,'0')}</span>
                  <span className="text-gray-300 truncate pr-4">{q.title || q.questionId}</span>
                  <span className="text-gray-400">
                    {typeof q.timeSeconds === 'number' ? formatMMSS(q.timeSeconds) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message */}
        <div className="bg-[#151515] border-[2px] border-[#333] p-6">
          <h3 className="text-white font-oswald text-2xl tracking-widest mb-6 inline-block border-b-[2px] border-[#10b981] pr-8 pb-1">ZORDON_TRANSMISSION</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="BROADCAST MESSAGE..."
              className="flex-1 bg-black border-[1px] border-gray-700 px-4 py-2 text-white font-mono text-sm uppercase tracking-widest focus:outline-none focus:border-elite-red"
            />
            <button
              onClick={sendMsg}
              className="px-6 py-2 bg-elite-red text-white uppercase font-black text-[10px] tracking-widest border-[2px] border-elite-red hover:bg-[#b0101f] transition-all"
            >
              TRANSMIT
            </button>
          </div>
        </div>

        {/* Violation log */}
        <div className="lg:col-span-2 bg-[#151515] border-[2px] border-[#333] p-6">
          <h3 className="text-white font-oswald text-2xl tracking-widest mb-6 inline-block border-b-[2px] border-[#eab308] pr-8 pb-1">
            INFRACTION_LOG // {violations.length}
          </h3>
          {violations.length === 0 ? (
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">NO INFRACTIONS DETECTED.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-4">
              {violations.map(v => (
                <div key={v.id} className="flex items-center gap-4 bg-[#0a0a0a] border-[1px] border-[#333] px-4 py-3 hover:border-gray-500 transition-colors">
                  <span className="font-mono text-gray-500 text-[10px] tracking-widest min-w-[60px]">
                    {new Date(v.occurred_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  
                  {v.severity === 'FLAG' && <span className="text-white bg-elite-red font-bold text-[10px] tracking-widest px-2 py-0.5 uppercase">FLAG</span>}
                  {v.severity === 'WARNING' && <span className="text-black bg-[#eab308] font-bold text-[10px] tracking-widest px-2 py-0.5 uppercase">WARN</span>}
                  {v.severity === 'INFO' && <span className="text-white bg-[#3b82f6] font-bold text-[10px] tracking-widest px-2 py-0.5 uppercase">INFO</span>}

                  <span className="font-bold text-xs uppercase tracking-widest text-gray-300">{v.type.replace(/_/g, ' ')}</span>
                  <span className="text-gray-600 px-2 py-0.5 text-[10px] font-mono ml-auto">[{v.device_id?.slice(0, 8)}]</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMMSS(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function Btn({ onClick, label }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 border-[2px] border-elite-red bg-elite-red text-white font-black tracking-[0.1em] text-[10px] uppercase transition-all hover:bg-[#b0101f] whitespace-nowrap`}>
      {label}
    </button>
  );
}