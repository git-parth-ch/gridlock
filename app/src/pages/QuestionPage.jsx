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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="bg-black border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpenQuestion(null)}
            className="text-gray-500 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            ← Back
          </button>
          <span className="text-gray-700">|</span>
          <span className="text-white font-medium text-sm">
            {question.type === 'debug' && 'Debug'}
            {question.type === 'find_output' && 'Find Output'}
            {question.type === 'fill_missing' && 'Fill Missing Code'}
          </span>
          {question.topic && (
            <span className="text-gray-500 text-xs">{question.topic}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 text-xs font-mono">{team?.code}</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded border
            ${lang === 'python' ? 'text-yellow-400 border-yellow-800'
            : lang === 'java' ? 'text-orange-400 border-orange-800'
            : 'text-blue-400 border-blue-800'}`}
          >
            {lang}
          </span>
          <span className="hidden lg:inline-flex">
            <ViolationBadge compact />
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-gray-500 border border-gray-800 rounded px-2 py-0.5">
            <span>Time:</span>
            <DeviceTimer />
          </span>
          <button
            onClick={onLogout}
            className="px-3 py-1 rounded-lg border border-red-700 text-red-200 text-xs font-medium hover:bg-red-950/30"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-gray-800 overflow-y-auto p-6 flex flex-col gap-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest">Question</p>
          {question.image_url ? (
            <img
              src={question.image_url}
              alt="Question"
              className="rounded-lg border border-gray-800 max-w-full select-none pointer-events-none"
              draggable={false}
              onContextMenu={e => e.preventDefault()}
            />
          ) : (
            <div className="rounded-lg border border-gray-800 p-8 text-gray-600 text-sm text-center">
              Question image not loaded
            </div>
          )}
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={LANG_ID[lang]}
              value={code}
              onChange={val => persistCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                contextmenu: false,
                readOnly: false,
              }}
            />
          </div>

          <div className="border-t border-gray-800 bg-gray-900 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-widest">Output</span>
              <button
                onClick={runCode}
                disabled={running}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${running
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
              >
                {running ? 'Running…' : '▶ Run Code'}
              </button>
            </div>
            <pre className="bg-black rounded-lg p-3 text-green-400 text-xs font-mono h-24 overflow-y-auto whitespace-pre-wrap">
              {output || '> Run your code to see output here'}
            </pre>
          </div>

          <div className="border-t border-gray-800 bg-black p-4">
            <div className="flex gap-3 items-stretch">
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                placeholder="Your answer…"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm
                           font-mono focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={submitAnswer}
                disabled={submitting || !answer.trim() || feedback === 'correct'}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                  ${submitting || !answer.trim()
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : feedback === 'correct'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-black hover:bg-gray-200'
                  }`}
              >
                {submitting ? 'Checking…' : 'Submit →'}
              </button>
            </div>

            {feedback === 'correct' && (
              <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                <span>✅</span>
                <span>Correct! Coordinate segment revealed. Returning to dashboard…</span>
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <span>❌</span>
                <span>Wrong answer — try again. No penalty.</span>
              </div>
            )}
            {feedback === 'error' && (
              <div className="mt-3 flex flex-col gap-1 text-orange-400 text-sm">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Could not verify answer.</span>
                </div>
                {submitError && (
                  <p className="text-orange-300/90 text-xs font-mono pl-6 break-all">{submitError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
