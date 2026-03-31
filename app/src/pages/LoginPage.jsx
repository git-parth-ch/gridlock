// app/src/pages/LoginPage.jsx
import { useState } from 'react';
import axios from 'axios';
import useStore from '../store/useStore';
import { connectSocket } from '../socket';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function LoginPage() {
  const [teamCode, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setTeam, setDeviceId, setQuestions, setSessionStatus, startDeviceTimer, setTeamCode, setConnectionStatus } = useStore();

  const handleJoin = async () => {
    const code = teamCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${BACKEND}/api/teams/join`, { teamCode: code });
      setTeam(data.team);
      setDeviceId(data.deviceId);
      setTeamCode(code);
      setQuestions(data.questions);
      setConnectionStatus('connecting');
      connectSocket(code, data.deviceId);
      startDeviceTimer();
      try {
        localStorage.setItem('gridlock_session', JSON.stringify({
          teamCode: code,
          deviceId: data.deviceId,
        }));
      } catch (_) {}
      // Map DB team status to UI session state
      setSessionStatus(
        data.team.status === 'active' ? 'active' :
        data.team.status === 'frozen' ? 'frozen' :
        data.team.status === 'disqualified' ? 'disqualified' :
        'waiting'
      );
    } catch (e) {
      const msg = e.response?.data?.error;
      if (msg === 'disqualified') setError('This team has been disqualified.');
      else if (msg === 'max_devices_reached') setError('This team code is already in use on another device.');
      else setError('Team code not found. Check your slip and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-elite-bg flex flex-col items-center justify-center p-8 font-inter">
      <div className="max-w-md w-full bg-elite-card border-[1px] border-gray-800 p-10 relative">
        <h1 className="text-4xl font-oswald text-gray-200 text-center tracking-widest mb-1">
          ELITE_SYSTEM
        </h1>
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-[1px] bg-elite-red"></div>
          <span className="text-[10px] text-elite-textMuted uppercase tracking-widest font-bold">GRIDLOCK AUTH // SECTOR_01</span>
          <div className="w-8 h-[1px] bg-elite-red"></div>
        </div>

        <label className="block text-elite-textMuted text-[10px] uppercase font-bold tracking-widest mb-2">
          TEAM DESIGNATION CODE
        </label>
        
        <input
          type="text"
          value={teamCode}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="ENTER AUTH KEY..."
          className="w-full bg-[#1e1e1e] border-[1px] border-gray-700 px-4 py-3 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-white mb-6 uppercase transition-all"
          autoFocus
        />

        {error && (
          <p className="text-elite-red font-bold text-xs tracking-widest text-center mb-6 py-2 border-[1px] border-elite-red/30 bg-elite-red/10 uppercase">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading || !teamCode.trim()}
          className={`w-full py-3 text-sm font-bold tracking-[0.2em] uppercase border-[1px] transition-all ${
            loading || !teamCode.trim()
              ? 'bg-transparent text-gray-600 border-gray-700 cursor-not-allowed'
              : 'bg-white text-black border-white hover:bg-gray-200 hover:border-gray-200 cursor-pointer'
          }`}
        >
          {loading ? 'AUTHENTICATING…' : 'AUTHORIZE_LINK'}
        </button>
      </div>
    </div>
  );
}