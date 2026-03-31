// app/src/components/FrozenOverlay.jsx
export default function FrozenOverlay({ teamCode, onLogout }) {
  return (
    <div className="fixed inset-0 bg-elite-bg flex flex-col items-center justify-center z-50 p-8 select-none font-inter">
      {/* Subtle animated scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {onLogout && (
        <button
          onClick={onLogout}
          className="absolute top-6 right-6 px-4 py-2 border-[1px] border-gray-700 text-elite-textMuted hover:bg-gray-800 hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
        >
          DISCONNECT
        </button>
      )}

      <div className="relative max-w-lg w-full flex flex-col items-center">
        {/* Top accent line */}
        <div className="w-full flex items-center gap-4 mb-10">
          <div className="flex-1 h-[2px] bg-elite-red" />
          <span className="text-elite-red text-[10px] font-bold tracking-[0.3em] uppercase">
            SYSTEM_ALERT
          </span>
          <div className="flex-1 h-[2px] bg-elite-red" />
        </div>

        {/* Main frozen icon */}
        <div className="w-20 h-20 border-[2px] border-elite-red flex items-center justify-center mb-8"
             style={{ animation: 'pulse 2s ease-in-out infinite' }}>
          <span className="text-4xl">⛔</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-oswald text-white tracking-widest text-center mb-2">
          SESSION_FROZEN
        </h1>
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-6 h-[1px] bg-elite-red" />
          <span className="text-elite-textMuted text-[10px] font-bold tracking-[0.2em] uppercase">
            GRIDLOCK // INFRACTION_LOCKOUT
          </span>
          <div className="w-6 h-[1px] bg-elite-red" />
        </div>

        {/* Message box */}
        <div className="w-full border-[1px] border-gray-700 bg-elite-card p-6 mb-6">
          <div className="text-[10px] text-elite-textMuted font-bold tracking-[0.2em] uppercase mb-3 border-b-[1px] border-gray-800 pb-2">
            LOCKOUT_REASON
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Multiple violations have been detected from this terminal.
            Your session has been <span className="text-elite-red font-bold">suspended</span> pending admin review.
          </p>
          <p className="text-elite-textMuted text-xs mt-3 uppercase tracking-wider">
            Contact an organizer at your table to resume.
          </p>
        </div>

        {/* Team code badge */}
        {teamCode && (
          <div className="w-full border-[1px] border-elite-red/30 bg-elite-red/5 p-4 flex items-center justify-between">
            <span className="text-[10px] text-elite-textMuted font-bold tracking-[0.2em] uppercase">
              TEAM_DESIGNATION
            </span>
            <span className="text-white font-mono text-lg tracking-widest">
              {teamCode.replace('GRIDLOCK-', '')}
            </span>
          </div>
        )}

        {/* Bottom accent */}
        <div className="w-full h-[2px] bg-elite-red mt-10 opacity-30" />
      </div>
    </div>
  );
}