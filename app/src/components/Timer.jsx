import { useState, useEffect } from 'react';

export default function Timer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <span className="font-mono text-gray-400 text-sm tabular-nums">
      {mm}:{ss}
    </span>
  );
}