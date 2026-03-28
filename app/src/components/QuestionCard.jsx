// app/src/components/QuestionCard.jsx
import useStore from '../store/useStore';
import { socket } from '../socket';

const STATUS_CONFIG = {
  open:        { dot: 'bg-blue-500',   label: 'Open',        text: 'text-blue-400' },
  in_progress: { dot: 'bg-yellow-400', label: 'In Progress', text: 'text-yellow-400' },
  solved:      { dot: 'bg-green-500',  label: 'Solved',      text: 'text-green-400' },
};

const TYPE_LABELS = {
  debug:        'Debug',
  find_output:  'Find Output',
  fill_missing: 'Fill Missing',
};

const LANG_COLORS = {
  python: 'text-yellow-400 border-yellow-800',
  java:   'text-orange-400 border-orange-800',
  cpp:    'text-blue-400   border-blue-800',
};

export default function QuestionCard({ question, index }) {
  const { setOpenQuestion, deviceId } = useStore();
  const cfg = STATUS_CONFIG[question.status] || STATUS_CONFIG.open;

  const handleOpen = () => {
    if (question.status === 'solved') return;

    // Notify team that this question is being worked on
    if (question.status !== 'in_progress') {
      socket.emit('question_opened', { questionId: question.id });
    }

    setOpenQuestion(question);
  };

  return (
    <div
      onClick={handleOpen}
      className={`rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200
        ${question.status === 'solved'
          ? 'border-green-900 bg-green-950/30 opacity-60 cursor-default'
          : question.status === 'in_progress'
          ? 'border-yellow-800 bg-yellow-950/20 cursor-pointer hover:border-yellow-600'
          : 'border-gray-800 bg-gray-900 cursor-pointer hover:border-gray-600 hover:bg-gray-800'
        }`}
    >
      {/* Top row: number + status */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs font-mono">Q{index}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Type + Topic */}
      <div>
        <p className="text-white font-medium text-sm">{TYPE_LABELS[question.type] || question.type}</p>
        {question.topic && (
          <p className="text-gray-500 text-xs mt-0.5">{question.topic}</p>
        )}
      </div>

      {/* Language badge */}
      <div className="mt-auto pt-2 border-t border-gray-800 flex items-center justify-between">
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${LANG_COLORS[question.language] || 'text-gray-400 border-gray-700'}`}>
          {question.language}
        </span>
        {question.status !== 'solved' && (
          <span className="text-gray-600 text-xs">
            {question.status === 'in_progress' ? 'Teammate working…' : 'Click to open →'}
          </span>
        )}
        {question.status === 'solved' && question.segmentValue && (
          <span className="text-green-500 text-xs font-mono">
            Segment: {question.segmentValue}
          </span>
        )}
      </div>
    </div>
  );
}