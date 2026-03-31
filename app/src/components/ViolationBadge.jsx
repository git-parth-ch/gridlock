import useStore from '../store/useStore';

export default function ViolationBadge({ compact = false }) {
  const violationCount = useStore(s => s.violationCount || { W: 0, F: 0 });
  const warnings = violationCount.W ?? 0;
  const flags = violationCount.F ?? 0;
  const total = warnings + flags;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-[10px] text-gray-500 border border-gray-300 px-2 py-0.5">
        <span className="uppercase tracking-widest font-bold">INFRACTIONS</span>
        <span className="text-yellow-600 font-mono font-bold">W:{warnings}</span>
        <span className="text-elite-red font-mono font-bold">F:{flags}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] text-elite-textMuted uppercase tracking-widest font-bold">INFRACTIONS</span>
      <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest">
        <span className="text-yellow-600">W:{warnings}</span>
        <span className="text-elite-red">F:{flags}</span>
        {total > 0 && <span className="text-gray-400">({total})</span>}
      </div>
    </div>
  );
}
