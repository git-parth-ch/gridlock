// admin/src/components/TeamRow.jsx
export default function TeamRow({
  team, rank, statusColor, onView, onFreeze, onUnfreeze, onDisqualify, onReveal
}) {
  const mm = String(Math.floor(team.total_time_seconds / 60)).padStart(2, '0');
  const ss = String(team.total_time_seconds % 60).padStart(2, '0');

  return (
    <div className="grid grid-cols-[48px_1fr_64px_80px_80px_100px_120px_140px]
                    px-4 py-3 border-b border-gray-800/50 hover:bg-gray-900/50 items-center text-sm">
      <span className="text-gray-500 font-mono">{rank}</span>

      <div>
        <p className="text-white font-medium font-mono text-xs">{team.code.replace('GRIDLOCK-', '')}</p>
        <p className="text-gray-600 text-xs">{team.devices_connected} device{team.devices_connected !== 1 ? 's' : ''}</p>
      </div>

      <span className="text-gray-400 font-mono text-xs">{team.question_set_id}</span>

      <span className="text-white font-mono">
        {team.questions_solved}
        <span className="text-gray-600 text-xs">/8</span>
      </span>

      <span className="text-gray-300 font-mono text-xs">{mm}:{ss}</span>

      <span className="text-xs">
        <span className="text-yellow-400">W:{team.violations?.W ?? 0}</span>
        {' '}
        <span className="text-red-400">F:{team.violations?.F ?? 0}</span>
      </span>

      <span className={`text-xs font-medium ${statusColor}`}>
        {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
      </span>

      <div className="flex gap-1.5 justify-end">
        <ActionBtn onClick={onView} label="View" color="gray" />
        {team.status === 'active' && (
          <ActionBtn onClick={onFreeze} label="Freeze" color="red" />
        )}
        {team.status === 'frozen' && (
          <ActionBtn onClick={() => onUnfreeze(true)} label="Unfreeze" color="green" />
        )}
        {team.status !== 'disqualified' && (
          <ActionBtn onClick={onReveal} label="Reveal" color="yellow" />
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, label, color }) {
  const c = {
    gray:   'text-gray-400 hover:text-white border-gray-700 hover:border-gray-500',
    red:    'text-red-400 hover:text-red-300 border-red-900 hover:border-red-700',
    green:  'text-green-400 hover:text-green-300 border-green-900 hover:border-green-700',
    yellow: 'text-yellow-400 hover:text-yellow-300 border-yellow-900 hover:border-yellow-700',
  };
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded border text-xs transition-all ${c[color]}`}
    >
      {label}
    </button>
  );
}