// app/src/pages/DashboardPage.jsx
import { useEffect } from 'react';
import useStore from '../store/useStore';
import { socket } from '../socket';
import QuestionCard from '../components/QuestionCard';
import FrozenOverlay from '../components/FrozenOverlay';
import CoordinateReveal from '../components/CoordinateReveal';
import AdminMessageBanner from '../components/AdminMessageBanner';
import ViolationMonitor from '../components/ViolationMonitor';
import Timer from '../components/Timer';

export default function DashboardPage() {
  const {
    team, questions, sessionStatus, coordinate,
    setSessionStatus, updateQuestionStatus, addSegment,
    setViolationCount, setCoordinate, setAdminMessage
  } = useStore();

  // ── Socket event listeners ──────────────────────────────
  useEffect(() => {
    // Question status update from another device
    socket.on('question_status_update', ({ questionId, status, segmentValue, coordinateSegment }) => {
      updateQuestionStatus(questionId, status);
      if (status === 'solved' && segmentValue) {
        addSegment(coordinateSegment, segmentValue);
      }
    });

    // Freeze / unfreeze / disqualify
    socket.on('session_frozen',    () => setSessionStatus('frozen'));
    socket.on('session_unfrozen',  () => setSessionStatus('active'));
    socket.on('disqualified',      () => setSessionStatus('disqualified'));
    socket.on('event_started',     () => setSessionStatus('active'));

    // Violation count sync
    socket.on('violation_count', (counts) => setViolationCount(counts));

    // Coordinate reveal
    socket.on('coordinate_revealed', ({ coordinate }) => {
      setCoordinate(coordinate);
      setSessionStatus('ended');
    });

    // Admin message
    socket.on('admin_message', ({ message }) => setAdminMessage(message));

    return () => {
      socket.off('question_status_update');
      socket.off('session_frozen');
      socket.off('session_unfrozen');
      socket.off('disqualified');
      socket.off('event_started');
      socket.off('violation_count');
      socket.off('coordinate_revealed');
      socket.off('admin_message');
    };
  }, []);

  if (sessionStatus === 'frozen')      return <FrozenOverlay teamCode={team?.code} />;
  if (sessionStatus === 'disqualified') return <DisqualifiedScreen />;
  if (sessionStatus === 'ended' && coordinate) return <CoordinateReveal coordinate={coordinate} />;
  if (sessionStatus === 'waiting')     return <WaitingRoom teamCode={team?.code} />;

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
          <Timer startedAt={team?.started_at} />
        </div>
      </header>

      {/* Violation monitor (invisible, fires events) */}
      <ViolationMonitor />

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

function WaitingRoom({ teamCode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-white tracking-widest mb-4">GRIDLOCK</h1>
      <p className="text-gray-400 mb-2">Team: <span className="text-white font-mono">{teamCode}</span></p>
      <p className="text-gray-500 text-sm animate-pulse">Waiting for organizer to start the event…</p>
    </div>
  );
}

function DisqualifiedScreen() {
  return (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-8">
      <h2 className="text-3xl font-bold text-red-300 mb-4">Session Disqualified</h2>
      <p className="text-red-400 text-center max-w-sm">
        Your team has been disqualified. Please see an organizer.
      </p>
    </div>
  );
}