// app/src/components/ViolationMonitor.jsx
// Invisible component – mounts once, fires violations via socket
import { useEffect, useState } from 'react';
import { socket } from '../socket';
import useStore from '../store/useStore';

// Toast notification shown on violation
function ViolationToast({ message, severity, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3000);
    return () => clearTimeout(id);
  }, []);

  const colors = {
    INFO: 'border-blue-700 bg-blue-950 text-blue-300',
    WARNING: 'border-yellow-600 bg-yellow-950 text-yellow-300',
    FLAG: 'border-red-600 bg-red-950 text-red-300',
  };

  const icons = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    FLAG: '🚩',
  };

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 
                     border rounded-xl px-6 py-4 text-sm font-medium
                     shadow-2xl flex items-center gap-3 ${colors[severity]}`}
      style={{ minWidth: 320 }}>
      <span>{icons[severity]}</span>
      <span>{message}</span>
    </div>
  );
}

export default function ViolationMonitor() {
  const sessionStatus = useStore(s => s.sessionStatus);
  const resetSession  = useStore(s => s.resetSession);
  const [toast, setToast] = useState(null);

  const showToast = (message, severity) => {
    setToast({ message, severity, key: Date.now() });
  };

  const report = (type, severity, message) => {
    console.log('VIOLATION:', type, severity, message);
    socket.emit('violation', { type, severity });
    showToast(message, severity);
  };

  useEffect(() => {
    if (sessionStatus !== 'active' && sessionStatus !== 'waiting') return;

    // Tab / window switch
    const handleVisibility = () => {
      if (document.hidden) {
        report('TAB_SWITCH', 'WARNING', 'Warning: Tab switch detected. This has been logged.');
      }
    };

    // Fullscreen exit
    const handleFullscreen = () => {
      // Only enforce fullscreen if we're in the Electron app
      const isElectron = !!window.electronAPI;
      if (isElectron && !document.fullscreenElement) {
        report('FULLSCREEN_EXIT', 'WARNING', 'Warning: Fullscreen exit detected. Please stay fullscreen.');
        document.documentElement.requestFullscreen?.().catch(() => { });
      }
    };

    // DevTools detection
    let devtoolsOpen = false;
    const devtoolsCheck = setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > 200 || heightDiff > 200;
      if (open && !devtoolsOpen) {
        devtoolsOpen = true;
        report('DEVTOOLS', 'FLAG', '🚩 DevTools detected. This has been flagged.');
      } else if (!open) {
        devtoolsOpen = false;
      }
    }, 1000);

    // Right-click block
    const blockContext = (e) => e.preventDefault();

    // Keyboard shortcuts
    const blockKeys = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key;

      // Common in-app shortcuts we want to forbid and count as violations.
      const blockedShortcut =
        ctrl && (key === 'c' || key === 'v' || key === 'a' || key === 'x' || key === 's') ||
        ctrl && (key === 'p' || key === 'u') ||
        ctrl && e.shiftKey && (key === 'I' || key === 'J' || key === 'C') ||
        key === 'F12';

      // Best-effort screenshot blockers (cannot fully prevent at OS level)
      const screenshotKey =
        key === 'PrintScreen' ||
        (ctrl && key === 'PrintScreen') ||
        (ctrl && e.shiftKey && key.toLowerCase() === 's');

      if (blockedShortcut) {
        e.preventDefault();
        report('SHORTCUT', 'WARNING', 'Keyboard shortcut usage is forbidden and has been logged.');
      } else if (screenshotKey) {
        e.preventDefault();
        report('SCREENSHOT_ATTEMPT', 'WARNING', 'Screenshots/screen recording are forbidden and have been logged.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
      clearInterval(devtoolsCheck);
    };
  }, [sessionStatus]);

  // Admin-initiated / server-initiated logout that should apply everywhere.
  useEffect(() => {
    const handleForceLogout = () => {
      socket.disconnect();
      resetSession();
    };

    socket.on('force_logout', handleForceLogout);
    return () => socket.off('force_logout', handleForceLogout);
  }, [resetSession]);

  // Electron main process events
  useEffect(() => {
    window.electronAPI?.onFullscreenWarning(() => {
      report('FULLSCREEN_EXIT', 'WARNING', 'Warning: Fullscreen exit detected.');
    });
    window.electronAPI?.onShortcutBlocked(() => {
      report('SHORTCUT', 'WARNING', 'Keyboard shortcut usage is forbidden and has been logged.');
    });
  }, []);

  return (
    <>
      {toast && (
        <ViolationToast
          key={toast.key}
          message={toast.message}
          severity={toast.severity}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}