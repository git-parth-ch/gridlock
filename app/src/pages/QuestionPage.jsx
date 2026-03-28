// app/src/pages/QuestionPage.jsx
import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import useStore from '../store/useStore';
import { socket } from '../socket';

const BACKEND   = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const PISTON    = import.meta.env.VITE_PISTON_URL  || 'https://emkc.org/api/v2/piston';

const PISTON_LANG = {
  python: { language: 'python',     version: '3.10.0' },
  java:   { language: 'java',       version: '15.0.2' },
  cpp:    { language: 'c++',        version: '10.2.0' },
};

const LANG_ID = { python: 'python', java: 'java', cpp: 'cpp' };

const DEFAULT_CODE = {
  python: '# Write your solution here\n',
  java:   'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  cpp:    '#include <iostream>\nusing namespace std;\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
};

export default function QuestionPage() {
  const { openQuestion: question, setOpenQuestion, team, deviceId, updateQuestionStatus, addSegment } = useStore();

  const [code,       setCode]     = useState(DEFAULT_CODE[question?.language] || '');
  const [output,     setOutput]   = useState('');
  const [running,    setRunning]  = useState(false);
  const [answer,     setAnswer]   = useState('');
  const [submitting, setSubmit]   = useState(false);
  const [feedback,   setFeedback] = useState(null); // 'correct' | 'wrong' | 'already_solved'

  const lang = question?.language || 'python';

  // ── Run code via Piston ─────────────────────────────────
  const runCode = useCallback(async () => {
    setRunning(true);
    setOutput('Running…');
    try {
      const pistonLang = PISTON_LANG[lang];
      const { data } = await axios.post(`${PISTON}/execute`, {
        language: pistonLang.language,
        version:  pistonLang.version,
        files: [{ name: 'main', content: code }],
        stdin: ''
      });
      const out = data.run?.output || data.run?.stderr || 'No output';
      setOutput(out);
    } catch (e) {
      setOutput('Code execution failed. Check your internet connection.');
    } finally {
      setRunning(false);
    }
  }, [code, lang]);

  // ── Submit answer ────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    if (!answer.trim() || !question) return;
    setSubmit(true);
    setFeedback(null);
    try {
      const { data } = await axios.post(`${BACKEND}/api/submissions`, {
        teamCode:   team.code,
        questionId: question.id,
        deviceId,
        answer: answer.trim()
      });

      if (data.result === 'correct' || data.result === 'already_solved') {
        setFeedback('correct');
        updateQuestionStatus(question.id, 'solved', { segmentValue: data.segmentValue });
        addSegment(data.coordinateSegment, data.segmentValue);

        // Broadcast to team
        socket.emit('question_solved', {
          questionId: question.id,
          segmentValue: data.segmentValue,
          coordinateSegment: data.coordinateSegment
        });

        // Return to dashboard after short delay
        setTimeout(() => setOpenQuestion(null), 2000);
      } else {
        setFeedback('wrong');
      }
    } catch (e) {
      setFeedback('error');
    } finally {
      setSubmit(false);
    }
  }, [answer, question, team, deviceId]);

  if (!question) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
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
          <span className={`text-xs font-mono px-2 py-0.5 rounded border
            ${lang === 'python' ? 'text-yellow-400 border-yellow-800'
            : lang === 'java'   ? 'text-orange-400 border-orange-800'
            :                     'text-blue-400 border-blue-800'}`}>
            {lang}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Question image */}
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

        {/* Right: Editor + output + submission */}
        <div className="w-1/2 flex flex-col">
          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={LANG_ID[lang]}
              value={code}
              onChange={val => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                contextmenu: false,
                // Disable paste shortcuts within editor (handled at OS level too)
                readOnly: false,
              }}
            />
          </div>

          {/* Run button + output */}
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

          {/* Answer submission */}
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

            {/* Feedback */}
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
          </div>
        </div>
      </div>
    </div>
  );
}