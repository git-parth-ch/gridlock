// app/src/pages/DashboardPage.jsx
import useStore from '../store/useStore';
import { socket } from '../socket';
import QuestionCard from '../components/QuestionCard';
import FrozenOverlay from '../components/FrozenOverlay';
import CoordinateReveal from '../components/CoordinateReveal';
import AdminMessageBanner from '../components/AdminMessageBanner';
import Timer from '../components/Timer';
import DeviceTimer from '../components/DeviceTimer';
import ViolationBadge from '../components/ViolationBadge';

export default function DashboardPage() {
  const {
    team, questions, sessionStatus, coordinate,
    resetSession
  } = useStore();

  const logout = () => {
    // Disconnecting the socket triggers backend cleanup (deletes this device)
    // and resets the UI back to the login screen.
    try { localStorage.removeItem('gridlock_session'); } catch (_) {}
    socket.disconnect();
    resetSession();
  };

  if (sessionStatus === 'frozen')      return <FrozenOverlay teamCode={team?.code} onLogout={logout} />;
  if (sessionStatus === 'disqualified') return <DisqualifiedScreen onLogout={logout} />;
  if (sessionStatus === 'ended' && coordinate) return <CoordinateReveal coordinate={coordinate} onLogout={logout} />;
  if (sessionStatus === 'ended' && !coordinate) return <EventEndedScreen onLogout={logout} />;
  if (sessionStatus === 'waiting')     return <WaitingRoom teamCode={team?.code} onLogout={logout} />;

  const solved     = questions.filter(q => q.status === 'solved').length;
  const total      = questions.length;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-widest">GRIDLOCK</span>
          <span className="text-gray-500 text-sm font-mono">{team?.code}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-gray-400 text-sm">
            {solved}/{total} solved
          </span>
          <ViolationBadge />
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Event:</span>
              <Timer startedAt={team?.started_at} />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>You:</span>
              <DeviceTimer />
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium
                       text-red-200 hover:bg-gray-900/60 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Admin message */}
      <AdminMessageBanner />

      {/* Question grid */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i + 1} />
        ))}
      </main>
    </div>
  );
}

function EventEndedScreen({ onLogout }) {
  return (
    <div className="min-h-screen bg-purple-950 flex flex-col items-center justify-center p-8">
      <h2 className="text-3xl font-bold text-purple-200 mb-4">Event Ended</h2>
      <p className="text-purple-200/70 text-center max-w-sm">
        The organizer ended the event. Please check the final leaderboard with the host.
      </p>
      {onLogout && (
        <button
          onClick={onLogout}
          className="mt-8 px-4 py-2 rounded-lg border border-purple-900 text-sm font-medium
                     text-purple-100 hover:bg-purple-900/40 transition-colors"
        >
          Logout
        </button>
      )}
    </div>
  );
}

function WaitingRoom({ teamCode, onLogout }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-white tracking-widest mb-4">GRIDLOCK</h1>
      <p className="text-gray-400 mb-2">Team: <span className="text-white font-mono">{teamCode}</span></p>
      <p className="text-gray-500 text-sm animate-pulse">Waiting for organizer to start the event…</p>
      {onLogout && (
        <button
          onClick={onLogout}
          className="mt-8 px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium
                     text-red-200 hover:bg-gray-900/60 transition-colors"
        >
          Logout
        </button>
      )}
    </div>
  );
}

function DisqualifiedScreen({ onLogout }) {
  return (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-8">
      <h2 className="text-3xl font-bold text-red-300 mb-4">Session Disqualified</h2>
      <p className="text-red-400 text-center max-w-sm">
        Your team has been disqualified. Please see an organizer.
      </p>
      {onLogout && (
        <button
          onClick={onLogout}
          className="mt-8 px-4 py-2 rounded-lg border border-red-900 text-sm font-medium
                     text-red-200 hover:bg-red-900/40 transition-colors"
        >
          Logout
        </button>
      )}
    </div>
  );
}