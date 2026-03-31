// admin/src/pages/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import TeamRow    from '../components/TeamRow';
import TeamDetail from './TeamDetail';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function api(method, path, data) {
  return axios({ method, url: `${BACKEND}${path}`, data,
    headers: { 'x-admin-password': sessionStorage.getItem('admin_pw') }
  });
}

let adminSocket = null;

export default function AdminDashboard() {
  const [teams,      setTeams]      = useState([]);
  const [selected,   setSelected]   = useState(null); // team code for detail view
  const [loading,    setLoading]    = useState(true);
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
  const startEvent    = async () => { await api('post', '/api/admin/start');       adminSocket?.emit('admin_start'); fetchLeaderboard(); };
  const pauseAll      = async () => { await api('post', '/api/admin/pause-all');   fetchLeaderboard(); };
  const unfreezeAll   = async () => { await api('post', '/api/admin/unfreeze-all'); fetchLeaderboard(); };
  const endEvent      = async () => {
    if (!confirm('End event for ALL teams? This will stop all timers and lock all participant apps.')) return;
    await api('post', '/api/admin/end');
    adminSocket?.emit('admin_end');
    setEventEnded(true);
    fetchLeaderboard();
  };
  const reopenEvent   = async () => {
    if (!confirm('Re-open event for all ended teams? Timers will continue from previous totals.')) return;
    await api('post', '/api/admin/reopen');
    adminSocket?.emit('admin_reopen');
    setEventEnded(false);
    fetchLeaderboard();
  };

  const handleUnfreeze   = async (code, reset) => {
    await api('post', `/api/admin/unfreeze/${code}`, { resetCount: reset });
    adminSocket?.emit('admin_unfreeze', { teamCode: code });
    fetchLeaderboard();
  };
  const handleFreeze     = async (code) => {
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
    active:        'text-green-400',
    waiting:       'text-blue-400',
    frozen:        'text-red-400',
    disqualified:  'text-gray-500',
    advanced:      'text-yellow-400',
    ended:         'text-purple-300',
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest">GRIDLOCK</h1>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Admin Dashboard</p>
        </div>
        <div className="text-gray-600 text-xs">
          {lastUpdate && `Updated ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </header>

      {/* Global controls */}
      <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap gap-3">
        <CtrlBtn color="green"  onClick={startEvent}  label="▶ Start Event" disabled={eventEnded} />
        <CtrlBtn color="yellow" onClick={pauseAll}    label="⏸ Pause All" disabled={eventEnded} />
        <CtrlBtn color="blue"   onClick={unfreezeAll} label="🔓 Unfreeze All" disabled={eventEnded} />
        <CtrlBtn color="purple" onClick={reopenEvent} label="↻ Re-open Event" disabled={!eventEnded} />
        <CtrlBtn color="red"    onClick={endEvent}    label="⏹ End Event" />
        <span className="ml-auto text-gray-600 text-sm self-center">
          {teams.length} teams · {teams.filter(t => t.status === 'active').length} active ·{' '}
          {teams.filter(t => t.status === 'frozen').length} frozen
        </span>
      </div>

      {/* Leaderboard */}
      <div className="p-6">
        {eventEnded && (
          <div className="mb-4 rounded-xl border border-purple-900 bg-purple-950/40 px-5 py-3">
            <div className="text-purple-200 text-sm font-medium">Event ended</div>
            <div className="text-purple-300/70 text-xs mt-1">
              This is the final leaderboard snapshot.
            </div>
          </div>
        )}
        {loading ? (
          <p className="text-gray-600 text-center py-12">Loading…</p>
        ) : (
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[48px_1fr_64px_80px_80px_100px_120px_140px]
                            bg-gray-900 px-4 py-2 text-xs text-gray-500 uppercase tracking-widest">
              <span>#</span>
              <span>Team</span>
              <span>Set</span>
              <span>Solved</span>
              <span>Time</span>
              <span>Violations</span>
              <span>Status</span>
              <span></span>
            </div>

            {teams.map((team, i) => (
              <div key={team.code}>
                {/* Cut line after rank 9 */}
                {i === 9 && (
                  <div className="bg-red-950/30 border-y border-red-900 px-4 py-1.5 flex items-center gap-2">
                    <span className="text-red-500 text-xs">✂</span>
                    <span className="text-red-400 text-xs uppercase tracking-widest">
                      Cut here — teams below this line are disqualified
                    </span>
                  </div>
                )}
                <TeamRow
                  team={team}
                  rank={i + 1}
                  statusColor={statusColor[team.status] || 'text-gray-400'}
                  onView={() => setSelected(team.code)}
                  onFreeze={() => handleFreeze(team.code)}
                  onUnfreeze={(reset) => handleUnfreeze(team.code, reset)}
                  onDisqualify={() => handleDisqualify(team.code)}
                  onReveal={() => handleReveal(team.code)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CtrlBtn({ color, onClick, label, disabled = false }) {
  const colors = {
    green:  'bg-green-900/40 border-green-800 text-green-400 hover:bg-green-900/70',
    yellow: 'bg-yellow-900/40 border-yellow-800 text-yellow-400 hover:bg-yellow-900/70',
    blue:   'bg-blue-900/40 border-blue-800 text-blue-400 hover:bg-blue-900/70',
    red:    'bg-red-900/40 border-red-800 text-red-400 hover:bg-red-900/70',
    purple: 'bg-purple-900/40 border-purple-800 text-purple-300 hover:bg-purple-900/70',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${colors[color]} ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
    >
      {label}
    </button>
  );
}