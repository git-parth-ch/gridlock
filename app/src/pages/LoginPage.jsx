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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-5xl font-bold text-white text-center tracking-widest mb-2">GRIDLOCK</h1>
        <p className="text-gray-500 text-center text-xs uppercase tracking-widest mb-12">
          GRIDLOCK - Codeathon
        </p>

        <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">
          Team Code
        </label>
        <input
          type="text"
          value={teamCode}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="GRIDLOCK-TEAM-XXX"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg
                     font-mono tracking-widest focus:outline-none focus:border-gray-400 mb-4"
          autoFocus
        />

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading || !teamCode.trim()}
          className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all
            ${loading || !teamCode.trim()
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-white text-black hover:bg-gray-200 cursor-pointer'
            }`}
        >
          {loading ? 'Connecting…' : 'Join Session'}
        </button>
      </div>
    </div>
  );
}