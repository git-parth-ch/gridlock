import useStore from '../store/useStore';

export default function CoordinateReveal({ coordinate, onLogout }) {
  const segments = useStore(s => s.segments);

  // Build the coordinate string from collected segments
  const lat = [
    segments['lat_int'],
    segments['lat_dec_1_2'],
    segments['lat_dec_3_4'],
    segments['lat_dec_5_6'],
  ].filter(Boolean).join('');

  const lng = [
    segments['lng_int'],
    segments['lng_dec'],
  ].filter(Boolean).join('');

  const coordString = lat && lng ? `${lat} ${lng}` : 'Check your answers';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 select-none">
      <div className="relative z-10 text-center max-w-xl w-full">
        {onLogout && (
          <button
            onClick={onLogout}
            className="absolute top-0 right-0 mt-2 mr-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 text-sm"
          >
            Logout
          </button>
        )}
        <p className="text-green-500 text-xs uppercase tracking-widest mb-8 animate-pulse">
          All questions solved
        </p>

        <h1 className="text-5xl font-bold text-white tracking-widest mb-12">
          GRIDLOCK
        </h1>

        {/* Raw coordinate string only — no location name */}
        <div className="bg-gray-900 border border-green-800 rounded-2xl p-10 mb-8">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
            Your destination
          </p>
          <p className="text-green-400 font-mono text-4xl tracking-widest">
            {coordString}
          </p>
        </div>

        {/* Segment breakdown — shows each answer contribution */}
        {Object.keys(segments).length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
              Assembled from your answers
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(segments).map(([seg, val]) => (
                <div key={seg} className="bg-gray-800 rounded-lg px-4 py-2">
                  <p className="text-gray-500 text-xs">{seg.replace(/_/g, ' ')}</p>
                  <p className="text-green-400 font-mono text-lg">{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-gray-500 text-sm">
          Show this screen to an organizer before leaving.
        </p>
      </div>
    </div>
  );
}