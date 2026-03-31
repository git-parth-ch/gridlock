// admin/src/pages/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import TeamRow from '../components/TeamRow';
import TeamDetail from './TeamDetail';

import zeddImg from '../../assets/lord zedd.png';
import redRangerImg from '../../assets/red mighty morphin.png';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function api(method, path, data) {
  return axios({
    method, url: `${BACKEND}${path}`, data,
    headers: { 'x-admin-password': sessionStorage.getItem('admin_pw') }
  });
}

let adminSocket = null;

export default function AdminDashboard() {
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState(null); // team code for detail view
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [eventEnded, setEventEnded] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await api('get', '/api/admin/leaderboard');
      setTeams(data);
      setEventEnded((data || []).length > 0 && (data || []).every(t => t.status === 'ended'));
      setLastUpdate(new Date());
    } catch (e) {
      if (e.response?.status === 401) {
        sessionStorage.removeItem('admin_pw');
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 s
  useEffect(() => {
    fetchLeaderboard();
    if (eventEnded) return;
    const id = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(id);
  }, [fetchLeaderboard, eventEnded]);

  // Connect admin socket for broadcasting
  useEffect(() => {
    adminSocket = io(BACKEND);
    return () => adminSocket?.disconnect();
  }, []);

  // ── Global controls ─────────────────────────────────────
  const startEvent = async () => { await api('post', '/api/admin/start'); adminSocket?.emit('admin_start'); fetchLeaderboard(); };
  const pauseAll = async () => { await api('post', '/api/admin/pause-all'); fetchLeaderboard(); };
  const unfreezeAll = async () => { await api('post', '/api/admin/unfreeze-all'); fetchLeaderboard(); };
  const endEvent = async () => {
    if (!confirm('End event for ALL teams? This will stop all timers and lock all participant apps.')) return;
    await api('post', '/api/admin/end');
    adminSocket?.emit('admin_end');
    setEventEnded(true);
    fetchLeaderboard();
  };
  const reopenEvent = async () => {
    if (!confirm('Re-open event for all ended teams? Timers will continue from previous totals.')) return;
    await api('post', '/api/admin/reopen');
    adminSocket?.emit('admin_reopen');
    setEventEnded(false);
    fetchLeaderboard();
  };

  const handleUnfreeze = async (code, reset) => {
    await api('post', `/api/admin/unfreeze/${code}`, { resetCount: reset });
    adminSocket?.emit('admin_unfreeze', { teamCode: code });
    fetchLeaderboard();
  };
  const handleFreeze = async (code) => {
    await api('post', `/api/admin/freeze/${code}`);
    adminSocket?.emit('admin_freeze', { teamCode: code });
    fetchLeaderboard();
  };
  const handleDisqualify = async (code) => {
    if (!confirm(`Disqualify ${code}?`)) return;
    await api('post', `/api/admin/disqualify/${code}`);
    adminSocket?.emit('admin_disqualify', { teamCode: code });
    fetchLeaderboard();
  };
  const handleReveal = async (code) => {
    if (!confirm(`Reveal coordinate to ${code}?`)) return;
    const { data: team } = await api('get', `/api/teams/${code}/status`);
    // Fetch full coordinate from supabase via backend
    await api('post', `/api/admin/reveal/${code}`);
    // Also need to fetch the coordinate to broadcast — backend should return it
    const { data: full } = await api('get', `/api/admin/coordinate/${code}`).catch(() => ({ data: null }));
    adminSocket?.emit('admin_reveal', { teamCode: code, coordinate: full });
    fetchLeaderboard();
  };
  const handleMessage = async (code, message) => {
    adminSocket?.emit('admin_message', { teamCode: code, message });
  };

  const handleLogout = async (code) => {
    if (!confirm(`Log out the device for ${code}?`)) return;
    await api('post', `/api/admin/logout/${code}`);
    fetchLeaderboard();
  };

  const statusColor = {
    active: 'text-green-400',
    waiting: 'text-blue-400',
    frozen: 'text-red-400',
    disqualified: 'text-gray-500',
    advanced: 'text-yellow-400',
    ended: 'text-purple-300',
  };

  if (selected) {
    return (
      <TeamDetail
        teamCode={selected}
        onBack={() => setSelected(null)}
        onUnfreeze={handleUnfreeze}
        onFreeze={handleFreeze}
        onDisqualify={handleDisqualify}
        onMessage={handleMessage}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-inter text-gray-200 pb-24 relative overflow-hidden">
      {/* Decor Images */}
      <img
        src={zeddImg}
        alt="Lord Zedd"
        className="fixed bottom-0 right-250 max-h-[75vh] w-auto object-contain opacity-30 z-0 pointer-events-none drop-shadow-[0_0_15px_rgba(242,29,47,0.5)]"
      />
      <img
        src={redRangerImg}
        alt="Red Ranger"
        className="fixed bottom-0 left-280 max-h-[75vh] w-auto object-contain opacity-30 z-0 pointer-events-none drop-shadow-[0_0_15px_rgba(242,29,47,0.5)]"
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-[#111] px-8 py-6 flex items-end justify-between border-b-[2px] border-[#333] bg-opacity-90 backdrop-blur-sm">
          <div>
            <h1 className="text-6xl font-oswald text-white tracking-tighter leading-none mb-2">ELITE_STATUS</h1>
            <div className="flex items-center gap-4">
              <div className="w-16 h-[2px] bg-elite-red"></div>
              <p className="text-elite-textMuted text-xs tracking-[0.2em] font-bold uppercase">
                GRIDLOCK ADMIN DECK / CYCLE_04
              </p>
            </div>
          </div>
          <div className="text-gray-400 text-xs tracking-widest font-mono">
            {lastUpdate && `SYNCED: ${lastUpdate.toLocaleTimeString()}`}
          </div>
        </header>

        {/* Global controls */}
        <div className="px-8 py-4 flex flex-wrap gap-4 items-center bg-[#151515] border-b-[2px] border-[#333]">
          <CtrlBtn color="green" onClick={startEvent} label="▶ Start Event" disabled={eventEnded} />
          <CtrlBtn color="yellow" onClick={pauseAll} label="⏸ Pause All" disabled={eventEnded} />
          <CtrlBtn color="blue" onClick={unfreezeAll} label="🔓 Unfreeze All" disabled={eventEnded} />
          <CtrlBtn color="purple" onClick={reopenEvent} label="↻ Re-open Event" disabled={!eventEnded} />
          <CtrlBtn color="red" onClick={endEvent} label="⏹ End Event" />
          <span className="ml-auto text-gray-400 text-xs tracking-widest font-mono">
            {teams.length} UNITS // {teams.filter(t => t.status === 'active').length} ACTIVE //{' '}
            {teams.filter(t => t.status === 'frozen').length} FROZEN
          </span>
        </div>

        {/* Leaderboard Wrapper */}
        <div className="p-8 max-w-6xl mx-auto">
          {eventEnded && (
            <div className="mb-8 border border-elite-red/30 bg-elite-red/5 px-6 py-4">
              <div className="text-elite-red text-sm font-bold tracking-widest uppercase">TERMINATED</div>
              <div className="text-elite-textMuted text-xs mt-1">This is the final network snapshot.</div>
            </div>
          )}

          {loading ? (
            <p className="text-elite-textMuted font-mono text-xs text-center py-12">ESTABLISHING CONNECTION…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Column headers */}
              <div className="flex justify-between px-4 pb-2 border-b-[2px] border-[#333]">
                <span className="text-gray-400 text-[10px] tracking-widest uppercase font-bold">RNK // OPERATIVE</span>
                <div className="hidden md:flex gap-12 text-gray-400 text-[10px] tracking-widest uppercase font-bold w-1/4">
                  <span>POINTS</span>
                  <span>VIOLATIONS</span>
                </div>
                <div className="hidden md:block w-1/2"></div>
              </div>

              {/* Top 3 Podium */}
              <div className="flex flex-col md:flex-row gap-2 mb-8 h-auto md:h-64 mt-4">
                {teams[1] && <TeamRow team={teams[1]} rank={2} statusColor={statusColor[teams[1].status]} isPodium={true} onView={() => setSelected(teams[1].code)} onFreeze={() => handleFreeze(teams[1].code)} onUnfreeze={(r) => handleUnfreeze(teams[1].code, r)} onDisqualify={() => handleDisqualify(teams[1].code)} onReveal={() => handleReveal(teams[1].code)} />}
                {teams[0] && <TeamRow team={teams[0]} rank={1} statusColor={statusColor[teams[0].status]} isPodium={true} onView={() => setSelected(teams[0].code)} onFreeze={() => handleFreeze(teams[0].code)} onUnfreeze={(r) => handleUnfreeze(teams[0].code, r)} onDisqualify={() => handleDisqualify(teams[0].code)} onReveal={() => handleReveal(teams[0].code)} />}
                {teams[2] && <TeamRow team={teams[2]} rank={3} statusColor={statusColor[teams[2].status]} isPodium={true} onView={() => setSelected(teams[2].code)} onFreeze={() => handleFreeze(teams[2].code)} onUnfreeze={(r) => handleUnfreeze(teams[2].code, r)} onDisqualify={() => handleDisqualify(teams[2].code)} onReveal={() => handleReveal(teams[2].code)} />}
              </div>

              {/* Rest of the list */}
              <div className="flex flex-col gap-2">
                {teams.slice(3, 9).map((team, i) => (
                  <TeamRow key={team.code} team={team} rank={i + 4} statusColor={statusColor[team.status] || 'text-gray-400'} onView={() => setSelected(team.code)} onFreeze={() => handleFreeze(team.code)} onUnfreeze={(reset) => handleUnfreeze(team.code, reset)} onDisqualify={() => handleDisqualify(team.code)} onReveal={() => handleReveal(team.code)} />
                ))}
              </div>

              {teams.length > 9 && (
                <>
                  <div className="w-full flex items-center my-8">
                    <div className="flex-1 border-t-[2px] border-[#333]"></div>
                    <span className="mx-4 text-[10px] text-gray-500 font-mono tracking-widest uppercase">CUT_ZONE</span>
                    <div className="flex-1 border-t-[2px] border-[#333]"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {teams.slice(9).map((team, i) => (
                      <TeamRow key={team.code} team={team} rank={i + 10} isSmall={true} statusColor={statusColor[team.status] || 'text-gray-400'} onView={() => setSelected(team.code)} onFreeze={() => handleFreeze(team.code)} onUnfreeze={(reset) => handleUnfreeze(team.code, reset)} onDisqualify={() => handleDisqualify(team.code)} onReveal={() => handleReveal(team.code)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({ color, onClick, label, disabled = false }) {
  const colors = {
    green: 'bg-[#10b981] text-white border-[#10b981] hover:bg-[#059669]',
    yellow: 'bg-[#eab308] text-black border-[#eab308] hover:bg-[#ca8a04]',
    blue: 'bg-[#3b82f6] text-white border-[#3b82f6] hover:bg-[#2563eb]',
    red: 'bg-[#ef4444] text-white border-[#ef4444] hover:bg-[#dc2626]',
    purple: 'bg-[#a855f7] text-white border-[#a855f7] hover:bg-[#9333ea]',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-1.5 border-[2px] text-xs uppercase font-black tracking-[0.1em] transition-all whitespace-nowrap ${disabled ? 'opacity-30 cursor-not-allowed border-gray-700 bg-transparent text-gray-500' : colors[color] || colors.red
        }`}
    >
      {label}
    </button>
  );
}