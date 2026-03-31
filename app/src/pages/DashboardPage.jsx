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
    <div className="min-h-screen bg-elite-bg flex flex-col font-inter text-elite-dark pb-24">
      {/* Header */}
      <header className="bg-elite-bg border-b-[1px] border-gray-200 px-8 py-6 flex items-end justify-between relative z-20">
        <div>
          <h1 className="text-4xl font-oswald text-gray-200 tracking-tighter leading-none mb-1">GRIDLOCK_TERMINAL</h1>
          <div className="flex items-center gap-4">
            <div className="w-12 h-[2px] bg-elite-red"></div>
            <p className="text-elite-textMuted text-[10px] tracking-[0.2em] font-bold uppercase">
              TEAM // {team?.code}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-end gap-8 mt-2 sm:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-elite-textMuted uppercase tracking-widest font-bold mb-1">PROGRESS</span>
            <span className="font-mono text-sm tracking-widest">{String(solved).padStart(2,'0')} / {String(total).padStart(2,'0')}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
              <span className="text-elite-textMuted">SYS_TIME</span>
              <span className="text-elite-dark"><Timer startedAt={team?.started_at} /></span>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
              <span className="text-elite-textMuted">TKN_TIME</span>
              <span className="text-elite-dark"><DeviceTimer /></span>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 border-[1px] border-gray-300 text-[10px] font-bold tracking-[0.1em] uppercase hover:bg-gray-100 transition-colors"
          >
            DISCONNECT
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
    <div className="min-h-screen bg-elite-bg flex flex-col items-center justify-center p-8 font-inter">
      <div className="max-w-md w-full border-[1px] border-gray-200 p-10 text-center relative bg-white">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-elite-red"></div>
        <h2 className="text-4xl font-oswald text-gray-200 tracking-widest mb-4">TERMINATED</h2>
        <p className="text-elite-textMuted text-[11px] uppercase tracking-[0.2em] font-bold mb-8">
          The operation has been concluded. Final telemetry synced to HQ.
        </p>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-3 bg-white text-black border-[1px] border-gray-300 text-xs font-bold tracking-[0.2em] uppercase hover:bg-gray-100 transition-all"
          >
            DISCONNECT_LINK
          </button>
        )}
      </div>
    </div>
  );
}

function WaitingRoom({ teamCode, onLogout }) {
  return (
    <div className="min-h-screen bg-elite-bg flex flex-col items-center justify-center p-8 font-inter">
      <div className="max-w-md w-full border-[1px] border-gray-200 p-10 text-center relative bg-white">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-elite-gold"></div>
        <h1 className="text-4xl font-oswald text-gray-200 tracking-widest mb-4">STANDBY...</h1>
        <p className="text-elite-dark font-bold text-xs uppercase tracking-[0.1em] mb-4">SQUAD_ID // <span className="font-mono">{teamCode}</span></p>
        <div className="text-elite-textMuted text-[10px] uppercase font-bold tracking-widest mb-8 border-[1px] border-gray-200 p-3 bg-gray-50 animate-pulse">
          AWAITING_MASTER_OVERRIDE
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-3 bg-white text-black border-[1px] border-gray-300 text-xs font-bold tracking-[0.2em] uppercase hover:bg-gray-100 transition-all"
          >
            ABORT_STANDBY
          </button>
        )}
      </div>
    </div>
  );
}

function DisqualifiedScreen({ onLogout }) {
  return (
    <div className="min-h-screen bg-elite-dark flex flex-col items-center justify-center p-8 font-inter">
      <div className="max-w-md w-full border-[1px] border-elite-red/30 p-10 text-center relative bg-elite-card">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-elite-red"></div>
        <h2 className="text-4xl font-oswald text-elite-red tracking-widest mb-4">DISQUALIFIED</h2>
        <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] font-bold mb-8">
          Your authorization has been permanently revoked due to protocol violations.
        </p>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-3 bg-transparent text-white border-[1px] border-white hover:bg-white hover:text-black text-xs font-bold tracking-[0.2em] uppercase transition-all"
          >
            ACKNOWLEDGE
          </button>
        )}
      </div>
    </div>
  );
}