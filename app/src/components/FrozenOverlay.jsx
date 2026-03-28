// app/src/components/FrozenOverlay.jsx
export default function FrozenOverlay({ teamCode }) {
  return (
    <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center z-50 p-8 select-none">
      <div className="text-6xl mb-6">⛔</div>
      <h1 className="text-3xl font-bold text-red-300 tracking-wider mb-3">
        GRIDLOCK — Session Frozen
      </h1>
      <p className="text-red-400 text-center max-w-md mb-6">
        Multiple violations have been detected.
        Please contact an organizer at your table to resume.
      </p>
      {teamCode && (
        <div className="bg-red-900/40 border border-red-800 rounded-xl px-8 py-4">
          <p className="text-red-300 text-xs uppercase tracking-widest mb-1 text-center">Team Code</p>
          <p className="text-white font-mono text-xl text-center">{teamCode.replace('GRIDLOCK-', '')}</p>
        </div>
      )}
    </div>
  );
}