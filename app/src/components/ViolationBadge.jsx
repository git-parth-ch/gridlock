import useStore from '../store/useStore';

export default function ViolationBadge({ compact = false }) {
  const violationCount = useStore(s => s.violationCount || { W: 0, F: 0 });
  const warnings = violationCount.W ?? 0;
  const flags = violationCount.F ?? 0;
  const total = warnings + flags;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-[10px] text-gray-400 border border-gray-800 rounded px-2 py-0.5">
        <span>Violations:</span>
        <span className="text-yellow-400">W:{warnings}</span>
        <span className="text-red-400">F:{flags}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/60">
      <span className="text-gray-500 text-xs uppercase tracking-widest">Violations</span>
      <span className="text-yellow-400 text-sm font-mono">W:{warnings}</span>
      <span className="text-red-400 text-sm font-mono">F:{flags}</span>
      <span className="text-gray-600 text-xs">Total: {total}</span>
    </div>
  );
}

