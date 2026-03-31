// admin/src/components/TeamRow.jsx
export default function TeamRow({
  team, rank, statusColor, onView, onFreeze, onUnfreeze, onDisqualify, onReveal, isPodium = false, isSmall = false
}) {
  const fmtRank = String(rank).padStart(2, '0');
  const points = team.questions_solved * 100;

  const rankColor = rank === 1 ? 'text-elite-red' : rank === 2 ? 'text-[#eab308]' : rank === 3 ? 'text-[#eab308]' : 'text-white';
  
  if (isPodium) {
    return (
      <div className={`flex flex-col justify-end bg-[#0a0a0a] px-8 pb-6 border-[2px] border-[#333] flex-1 relative ${rank === 1 ? 'md:flex-[1.2]' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent"></div>
        {rank === 1 && <div className="absolute top-4 right-4"><span className="text-elite-red font-bold text-xl">LEADER</span></div>}
        <div className="relative z-10">
          <span className={`font-oswald text-6xl leading-none ${rankColor}`}>{fmtRank}</span>
          <h3 className="font-inter font-black text-white text-2xl tracking-widest uppercase mt-2 mb-4">
            {team.name || `TEAM_${team.code}`}
          </h3>
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">POINTS</div>
              <div className="text-white font-mono text-xl font-bold">{points.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">VIOLATIONS</div>
              <div className="text-elite-red font-bold text-xl text-right">{team.violations?.F ?? 0}</div>
            </div>
          </div>
          <div className="text-[10px] bg-white text-black tracking-widest font-bold px-2 py-0.5 inline-block mb-4 uppercase">
            STATUS: {team.status}
          </div>
          {/* Admin Controls Overlay */}
          <div className="flex flex-wrap gap-2 mt-auto">
            <ActionBtn onClick={onView} label="VIEW TEAM" />
            {team.status === 'active' && <ActionBtn onClick={onFreeze} label="FREEZE TEAM" />}
            {team.status === 'frozen' && <ActionBtn onClick={() => onUnfreeze(true)} label="UNFREEZE TEAM" />}
            {team.status !== 'disqualified' && <ActionBtn onClick={onDisqualify} label="SUSPEND TEAM" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center bg-[#0a0a0a] border-[2px] border-[#333] ${isSmall ? 'p-3' : 'px-6 py-4'} justify-between hover:border-elite-red transition-all`}>
      <div className="flex items-center gap-6 w-1/4">
        <span className={`font-oswald ${isSmall ? 'text-xl' : 'text-3xl'} leading-none text-gray-400`}>{fmtRank}</span>
        <div className="flex flex-col">
          <h4 className={`text-white font-black tracking-widest uppercase ${isSmall ? 'text-xs' : 'text-base'}`}>{team.name || `TEAM_${team.code}`}</h4>
        </div>
      </div>
      
      {!isSmall && (
        <div className="hidden md:flex gap-12 w-1/4 text-white font-mono font-bold text-sm items-center">
          <div className="flex flex-col"><span className="text-[8px] text-gray-500 tracking-widest">POINTS</span>{points}</div>
          <div className="flex flex-col text-elite-red"><span className="text-[8px] text-gray-500 tracking-widest">VIOLATIONS</span>{team.violations?.F ?? 0}</div>
          <div className="bg-white text-black px-2 py-0.5 text-[10px] tracking-widest uppercase">{team.status}</div>
        </div>
      )}
      {isSmall && <span className="text-gray-300 text-[10px] font-mono font-bold">{points} PTS</span>}

      {/* Admin Controls inline */}
      <div className="flex flex-wrap gap-2 justify-end w-1/2">
        <ActionBtn onClick={onView} label="VIEW" />
        {team.status === 'active' && <ActionBtn onClick={onFreeze} label="FREEZE TEAM" />}
        {team.status === 'frozen' && <ActionBtn onClick={() => onUnfreeze(true)} label="UNFREEZE TEAM" />}
        {team.status !== 'disqualified' && <ActionBtn onClick={onDisqualify} label="SUSPEND TEAM" />}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-elite-red text-white border-[2px] border-elite-red hover:bg-[#b0101f] transition-all whitespace-nowrap`}
    >
      {label}
    </button>
  );
}