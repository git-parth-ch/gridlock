// app/src/App.jsx
import { useEffect, useRef } from 'react';
import useStore from './store/useStore';
import PreflightPage  from './pages/PreflightPage';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import QuestionPage   from './pages/QuestionPage';

import ViolationMonitor from './components/ViolationMonitor';
import ConnectionBanner from './components/ConnectionBanner';
import { socket, connectSocket } from './socket';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function App() {
  const {
    sessionStatus, openQuestion,
    teamCode, deviceId,
    setTeam, setQuestions, setSessionStatus, resetSession,
    updateQuestionStatus, addSegment, setViolationCount, setCoordinate, setAdminMessage,
    setConnectionStatus,
    setOpenQuestion,
  } = useStore();

  const heartbeatId = useRef(null);

  // Crash-safe session resume (best-effort)
  useEffect(() => {
    if (sessionStatus !== 'login') return;
    try {
      const raw = localStorage.getItem('gridlock_session');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved?.teamCode || !saved?.deviceId) return;
      setConnectionStatus('connecting');
      connectSocket(saved.teamCode, saved.deviceId);
    } catch (_) {}
  }, [sessionStatus]);

  // Socket connection lifecycle + auto re-join on reconnect
  useEffect(() => {
    const onConnect = async () => {
      setConnectionStatus('online');
      if (teamCode && deviceId) {
        socket.emit('join_team', { teamCode, deviceId });
        // Lightweight resync after reconnect
        try {
          const { data } = await axios.post(`${BACKEND}/api/teams/resume`, { teamCode, deviceId });
          setTeam(data.team);
          setQuestions(data.questions);
          setSessionStatus(
            data.team.status === 'active' ? 'active' :
            data.team.status === 'frozen' ? 'frozen' :
            data.team.status === 'disqualified' ? 'disqualified' :
            data.team.status === 'ended' ? 'ended' :
            'waiting'
          );
        } catch (_) {
          // If resume fails, force back to login to avoid stuck state
          resetSession();
        }
      }
    };

    const onDisconnect = () => setConnectionStatus('offline');
    const onReconnecting = () => setConnectionStatus('reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnecting);
    socket.io.on('reconnect_error', onReconnecting);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnecting);
      socket.io.off('reconnect_error', onReconnecting);
    };
  }, [teamCode, deviceId]);

  // Device heartbeat while in session (prevents ghost locks after crashes)
  useEffect(() => {
    if (heartbeatId.current) {
      clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    }

    const shouldHeartbeat =
      !!teamCode && !!deviceId && (sessionStatus === 'waiting' || sessionStatus === 'active' || sessionStatus === 'frozen');

    if (!shouldHeartbeat) return;

    heartbeatId.current = setInterval(() => {
      axios.post(`${BACKEND}/api/teams/heartbeat`, { teamCode, deviceId }).catch(() => {});
    }, 15000);

    return () => {
      if (heartbeatId.current) clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    };
  }, [teamCode, deviceId, sessionStatus]);

  // Global team event listeners (must stay active on every page, including Question view)
  useEffect(() => {
    const onQuestionUpdate = ({ questionId, status, segmentValue, coordinateSegment }) => {
      updateQuestionStatus(questionId, status);
      if (status === 'solved' && segmentValue) {
        addSegment(coordinateSegment, segmentValue);
      }
    };

    const onFrozen = () => setSessionStatus('frozen');
    const onUnfrozen = () => setSessionStatus('active');
    const onDisqualified = () => setSessionStatus('disqualified');
    const onStarted = () => setSessionStatus('active');
    const onViolationCount = (counts) => setViolationCount(counts);
    const onCoordinate = ({ coordinate }) => {
      setCoordinate(coordinate);
      setSessionStatus('ended');
    };
    const onEnded = () => {
      setOpenQuestion(null);
      setSessionStatus('ended');
    };
    const onAdminMessage = ({ message }) => setAdminMessage(message);

    socket.on('question_status_update', onQuestionUpdate);
    socket.on('session_frozen', onFrozen);
    socket.on('session_unfrozen', onUnfrozen);
    socket.on('disqualified', onDisqualified);
    socket.on('event_started', onStarted);
    socket.on('event_ended', onEnded);
    socket.on('violation_count', onViolationCount);
    socket.on('coordinate_revealed', onCoordinate);
    socket.on('admin_message', onAdminMessage);

    return () => {
      socket.off('question_status_update', onQuestionUpdate);
      socket.off('session_frozen', onFrozen);
      socket.off('session_unfrozen', onUnfrozen);
      socket.off('disqualified', onDisqualified);
      socket.off('event_started', onStarted);
      socket.off('event_ended', onEnded);
      socket.off('violation_count', onViolationCount);
      socket.off('coordinate_revealed', onCoordinate);
      socket.off('admin_message', onAdminMessage);
    };
  }, [updateQuestionStatus, addSegment, setSessionStatus, setViolationCount, setCoordinate, setAdminMessage, setOpenQuestion]);

  // If a question is open, show the question view on top with ViolationMonitor
  if (openQuestion && sessionStatus !== 'frozen' && sessionStatus !== 'disqualified' && sessionStatus !== 'ended') return (
    <>
      <ViolationMonitor />
      <ConnectionBanner />
      <QuestionPage />
    </>
  );

  let page;
  switch (sessionStatus) {
    case 'preflight':
      page = <PreflightPage />;
      break;
    case 'login':
      page = <LoginPage />;
      break;
    default:
      page = <DashboardPage />;
  }

  return (
    <>
      <ViolationMonitor />
      <ConnectionBanner />
      {page}
    </>
  );
}
