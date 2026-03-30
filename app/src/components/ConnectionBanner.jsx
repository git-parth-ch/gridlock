import useStore from '../store/useStore';

export default function ConnectionBanner() {
  const status = useStore(s => s.connectionStatus);
  const sessionStatus = useStore(s => s.sessionStatus);

  if (sessionStatus === 'preflight' || sessionStatus === 'login') return null;
  if (status === 'online') return null;

  const cfg = {
    connecting:   { text: 'Connecting…',  cls: 'bg-blue-950/80 border-blue-800 text-blue-200' },
    reconnecting: { text: 'Reconnecting…', cls: 'bg-yellow-950/80 border-yellow-800 text-yellow-200' },
    offline:      { text: 'Offline — check WiFi', cls: 'bg-red-950/80 border-red-800 text-red-200' },
  }[status] || { text: 'Connecting…', cls: 'bg-blue-950/80 border-blue-800 text-blue-200' };

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl border shadow-2xl text-sm ${cfg.cls}`}>
      {cfg.text}
    </div>
  );
}

