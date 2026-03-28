import { useEffect } from 'react';
import useStore from '../store/useStore';

export default function AdminMessageBanner() {
  const { adminMessage, setAdminMessage } = useStore();

  useEffect(() => {
    if (!adminMessage) return;
    const id = setTimeout(() => setAdminMessage(null), 10000);
    return () => clearTimeout(id);
  }, [adminMessage]);

  if (!adminMessage) return null;

  return (
    <div className="bg-yellow-900/80 border-b border-yellow-700 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-yellow-400 text-sm">📡 Message from organizer:</span>
        <span className="text-yellow-200 text-sm font-medium">{adminMessage}</span>
      </div>
      <button
        onClick={() => setAdminMessage(null)}
        className="text-yellow-600 hover:text-yellow-300 text-xs"
      >
        Dismiss
      </button>
    </div>
  );
}
