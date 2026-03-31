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
      className={`relative p-5 flex flex-col gap-3 transition-colors duration-200 border-[1px]
        ${question.status === 'solved'
          ? 'border-gray-800 bg-elite-card opacity-50 cursor-default'
          : question.status === 'in_progress'
          ? 'border-elite-gold bg-[#151515] cursor-pointer'
          : 'border-gray-800 bg-[#151515] cursor-pointer hover:bg-[#1a1a1a] hover:border-gray-600'
        }`}
    >
      {question.status === 'in_progress' && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-elite-gold"></div>
      )}
      {question.status === 'solved' && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gray-600"></div>
      )}

      {/* Top row: number + status */}
      <div className="flex items-center justify-between border-b-[1px] border-gray-800 pb-2 mb-1">
        <span className="text-gray-500 text-xl font-oswald tracking-widest leading-none">
          {String(index).padStart(2,'0')}
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-sm ${cfg.dot === 'bg-blue-500' ? 'bg-gray-400' : cfg.dot === 'bg-yellow-400' ? 'bg-elite-gold' : 'bg-gray-600'}`} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-elite-textMuted">{cfg.label}</span>
        </div>
      </div>

      {/* Type + Topic */}
      <div className="flex-1">
        <p className={`font-inter font-bold text-sm tracking-widest uppercase ${question.status === 'solved' ? 'text-gray-500' : 'text-white'}`}>
          {TYPE_LABELS[question.type] || question.type}
        </p>
        {question.topic && (
          <p className="text-elite-textMuted text-[10px] uppercase tracking-widest mt-1">{question.topic}</p>
        )}
      </div>

      {/* Language badge */}
      <div className="mt-2 text-[10px] tracking-widest flex items-center justify-between text-elite-textMuted font-mono">
        <span className="uppercase">
          [ {question.language} ]
        </span>
        {question.status !== 'solved' && (
          <span className="uppercase font-bold text-gray-400">
            {question.status === 'in_progress' ? 'ACTIVE_LINK' : 'INITIALIZE →'}
          </span>
        )}
        {question.status === 'solved' && question.segmentValue && (
          <span className="uppercase text-gray-500">
            SEC_CODE: {question.segmentValue}
          </span>
        )}
      </div>
    </div>
  );
}