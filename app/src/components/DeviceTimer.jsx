import { useState, useEffect } from 'react';
import useStore from '../store/useStore';

// Per-device session timer: starts when the user joins the test,
// runs whenever they are in the app with an active/waiting session,
// and pauses automatically when the event is paused or they log out/crash.
export default function DeviceTimer() {
  const sessionStatus     = useStore(s => s.sessionStatus);
  const deviceTimerStart  = useStore(s => s.deviceTimerStart);
  const deviceTimerOffset = useStore(s => s.deviceTimerOffset);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let id;

    const tick = () => {
      if (!deviceTimerStart) return;
      const isRunning = sessionStatus === 'active' || sessionStatus === 'waiting';
      if (!isRunning) return;
      const seconds = Math.floor((Date.now() - deviceTimerStart) / 1000) + (deviceTimerOffset || 0);
      setElapsed(seconds);
    };

    if (deviceTimerStart) {
      tick();
      id = setInterval(tick, 1000);
    }

    return () => {
      if (id) clearInterval(id);
    };
  }, [deviceTimerStart, deviceTimerOffset, sessionStatus]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <span className="font-mono text-gray-400 text-xs md:text-sm tabular-nums">
      {mm}:{ss}
    </span>
  );
}

