// app/src/pages/QuestionPage.jsx
import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import useStore from '../store/useStore';
import { socket } from '../socket';
import DeviceTimer from '../components/DeviceTimer';
import ViolationBadge from '../components/ViolationBadge';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const HTTP_TIMEOUT_MS = 30000;

const LANG_ID = { python: 'python', java: 'java', cpp: 'cpp' };

const DEFAULT_CODE = {
  python: '# Write your solution here\n',
  java:   'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  cpp:    '#include <iostream>\nusing namespace std;\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
};

export default function QuestionPage() {
  const {
    openQuestion: question,
    setOpenQuestion,
    team,
    deviceId,
    updateQuestionStatus,
    addSegment,
    resetSession,
    questionDrafts,
    setQuestionDraft,
  } = useStore();

  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmit] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const lang = question?.language || 'python';

  // Restore draft when opening a question (or default template)
  useEffect(() => {
    if (!question?.id) return;
    const saved = questionDrafts[question.id];
    setCode(saved !== undefined && saved !== null ? saved : (DEFAULT_CODE[lang] || ''));
    setOutput('');
    setAnswer('');
    setFeedback(null);
    setSubmitError(null);
  }, [question?.id, lang]);

  const persistCode = useCallback(
    (val) => {
      setCode(val);
      if (question?.id) setQuestionDraft(question.id, val);
    },
    [question?.id, setQuestionDraft]
  );

  const runCode = useCallback(async () => {
    if (!question) return;
    setRunning(true);
    setOutput('Running…');
    try {
      const res = await axios.post(
        `${BACKEND}/api/execute`,
        { code, language: lang },
        { timeout: HTTP_TIMEOUT_MS }
      );
      const d = res.data;
      if (d.compile_output) {
        setOutput(`Compile error:\n${d.compile_output}`);
      } else if (d.stderr && d.stderr.trim()) {
        setOutput(`Error:\n${d.stderr}`);
      } else if (d.stdout && d.stdout.trim()) {
        setOutput(d.stdout.trim());
      } else {
        setOutput(d.status || 'No output');
      }
    } catch (e) {
      const msg =
        e.code === 'ECONNABORTED'
          ? 'Request timed out — is the backend running?'
          : e.response?.data?.error || e.message || 'Request failed';
      setOutput(`Execution failed: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [code, lang, question]);


  const submitAnswer = useCallback(async () => {
    if (!answer.trim() || !question || !team?.code) return;
    setSubmit(true);
    setFeedback(null);
    setSubmitError(null);
    try {
      const { data } = await axios.post(
        `${BACKEND}/api/submissions`,
        {
          teamCode: team.code,
          questionId: question.id,
          deviceId,
          answer: answer.trim(),
        },
        { timeout: HTTP_TIMEOUT_MS }
      );

      console.log('[submitAnswer] Response:', data);

      if (data.isCorrect) {
        setFeedback('correct');
        updateQuestionStatus(question.id, 'solved', { segmentValue: data.segmentValue });
        if (data.coordinateSegment && data.segmentValue != null) {
          addSegment(data.coordinateSegment, data.segmentValue);
        }
        socket.emit('question_solved', {
          questionId: question.id,
          segmentValue: data.segmentValue,
          coordinateSegment: data.coordinateSegment,
        });
        setTimeout(() => setOpenQuestion(null), 2000);
      } else {
        setFeedback('wrong');
      }
    } catch (e) {
      console.error('[submitAnswer] Error:', e);
      setFeedback('error');
      const detail =
        e.code === 'ECONNABORTED'
          ? 'Request timed out. Check backend is running and Supabase is reachable.'
          : e.response?.data?.error || e.message || 'Network error';
      setSubmitError(String(detail));
    } finally {
      setSubmit(false);
    }
  }, [answer, question, team, deviceId, updateQuestionStatus, addSegment, setOpenQuestion]);

  const onLogout = () => {
    try { localStorage.removeItem('gridlock_session'); } catch (_) {}
    socket.disconnect();
    resetSession();
  };

  if (!question) return null;

  return (
    <div className="min-h-screen bg-elite-bg flex flex-col font-inter">
      <header className="bg-elite-bg border-b-[1px] border-gray-200 px-8 py-4 flex flex-wrap items-center justify-between relative z-20 gap-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setOpenQuestion(null)}
            className="text-[10px] text-elite-textMuted uppercase tracking-[0.2em] font-bold hover:text-black transition-colors"
          >
            ← RETURN
          </button>
          <div className="h-4 w-[1px] bg-gray-300"></div>
          <span className="text-gray-200 font-oswald text-2xl tracking-widest flex items-center gap-4">
            {question.type === 'debug' && 'DEBUG_MISSION'}
            {question.type === 'find_output' && 'FIND_OUTPUT'}
            {question.type === 'fill_missing' && 'FILL_MISSING'}
            <div className="w-8 h-[2px] bg-elite-red hidden sm:block"></div>
          </span>
          {question.topic && (
            <span className="text-elite-textMuted font-mono text-[10px] uppercase tracking-widest hidden sm:inline-block">/ {question.topic}</span>
          )}
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-elite-textMuted">
          <span>TEAM // {team?.code}</span>
          <span>LANG // {lang}</span>
          <span className="hidden lg:inline-flex">
            <ViolationBadge compact />
          </span>
          <span className="hidden md:inline-flex items-center gap-2">
            <span>TKN_TIME:</span>
            <span className="text-elite-dark font-bold"><DeviceTimer /></span>
          </span>
          <button
            onClick={onLogout}
            className="px-3 py-1 border-[1px] border-gray-300 hover:bg-gray-100 transition-colors"
          >
            DISCONNECT
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Side: Objective image */}
        <div className="w-full lg:w-1/2 bg-gray-50 border-r-[1px] border-gray-200 overflow-y-auto p-8 flex flex-col gap-6">
          <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-elite-textMuted border-b-[1px] border-gray-200 pb-2">
            OBJECTIVE_DATA
          </div>
          {question.image_url ? (
            <img
              src={question.image_url}
              alt="Question"
              className="max-w-full rounded-sm select-none pointer-events-none border-[1px] border-gray-200 shadow-sm"
              draggable={false}
              onContextMenu={e => e.preventDefault()}
            />
          ) : (
            <div className="p-8 text-elite-textMuted font-mono text-xs text-center border-[1px] border-dashed border-gray-300">
              [ NO VISUAL DATA FOUND ]
            </div>
          )}
        </div>

        {/* Right Side: Code & Terminal */}
        <div className="w-full lg:w-1/2 flex flex-col bg-elite-card">
          <div className="flex-1 min-h-[300px] flex flex-col border-b-[1px] border-gray-800">
            <div className="bg-[#111] px-6 py-3 border-b-[1px] border-gray-800 text-gray-500 font-mono text-[10px] tracking-widest uppercase flex justify-between items-center">
              <span>WORKSPACE // ACTIVE</span>
            </div>
            <div className="flex-1 bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={LANG_ID[lang]}
                value={code}
                onChange={val => persistCode(val || '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: '"Fira Code", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  contextmenu: false,
                  readOnly: false,
                }}
              />
            </div>
          </div>

          <div className="bg-elite-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pointer-events-auto">
              <span className="text-[10px] text-elite-textMuted font-bold uppercase tracking-[0.2em]">CONSOLE_OUTPUT</span>
              <button
                onClick={runCode}
                disabled={running}
                className={`px-6 py-2 border-[1px] text-[10px] font-bold tracking-[0.2em] uppercase transition-all
                  ${running
                    ? 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'
                    : 'bg-white text-black border-white hover:bg-gray-200'
                  }`}
              >
                {running ? 'EXECUTING...' : 'EXECUTE'}
              </button>
            </div>
            <pre className="bg-[#151515] border-[1px] border-gray-800 p-4 text-gray-300 text-xs font-mono h-24 overflow-y-auto whitespace-pre-wrap">
              {output || '> SYSTEM STANDBY'}
            </pre>
          </div>

          <div className="bg-[#111] p-6 border-t-[1px] border-gray-800">
            <div className="flex gap-4 items-stretch flex-col sm:flex-row">
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                placeholder="INPUT FLAG DATA..."
                className="flex-1 bg-[#151515] border-[1px] border-gray-700 px-4 py-3 text-white text-sm font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-white uppercase"
              />
              <button
                onClick={submitAnswer}
                disabled={submitting || !answer.trim() || feedback === 'correct'}
                className={`px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase transition-all border-[1px]
                  ${submitting || !answer.trim()
                    ? 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'
                    : feedback === 'correct'
                    ? 'bg-white text-black border-white'
                    : 'bg-elite-red text-white border-elite-red hover:bg-[#d41c2c]'
                  }`}
              >
                {submitting ? 'UPLOADING…' : 'SUBMIT_DATA'}
              </button>
            </div>

            {feedback === 'correct' && (
              <div className="mt-4 flex items-center gap-2 text-[10px] tracking-widest text-[#10b981] font-mono">
                <span>[OK] VALIDATION PASSED. DECRYPTING COORDINATE SEGMENT.</span>
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="mt-4 flex items-center gap-2 text-[10px] tracking-widest text-elite-red font-mono">
                <span>[ERR] INVALID HASH. NO PENALTY ASSIGNED.</span>
              </div>
            )}
            {feedback === 'error' && (
              <div className="mt-4 flex flex-col gap-1 text-[10px] tracking-widest text-elite-gold font-mono">
                <div className="flex items-center gap-2">
                  <span>[WARN] CONNECTION REFUSED BY TARGET HOST.</span>
                </div>
                {submitError && (
                  <p className="ml-4 opacity-70">{submitError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
