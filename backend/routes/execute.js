// backend/routes/execute.js
// Local code execution — no external API needed.
// Uses child_process to run Python / Java / C++ on the host machine.
// Requires: python3/python, javac+java, g++ to be on PATH.
const router = require('express').Router();
const { execFile, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { randomUUID } = require('crypto');

const TIMEOUT_MS = 10000; // 10 s per execution
const MAX_OUTPUT = 10000; // characters

// Helper: run a shell command and return { stdout, stderr, killed }
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      ...opts,
    }, (err, stdout, stderr) => {
      resolve({
        stdout: (stdout || '').slice(0, MAX_OUTPUT),
        stderr: (stderr || '').slice(0, MAX_OUTPUT),
        killed: err?.killed || false,
        code: err?.code,
      });
    });
  });
}

// Helper (Windows): run via cmd shell for commands that need .cmd / PATH resolution
function runShell(command, opts = {}) {
  return new Promise((resolve) => {
    exec(command, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      ...opts,
    }, (err, stdout, stderr) => {
      resolve({
        stdout: (stdout || '').slice(0, MAX_OUTPUT),
        stderr: (stderr || '').slice(0, MAX_OUTPUT),
        killed: err?.killed || false,
        code: err?.code,
      });
    });
  });
}

router.post('/', async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  // Create a temp directory for this execution
  const tmpDir = path.join(os.tmpdir(), `gridlock-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    let result;

    if (language === 'python') {
      const file = path.join(tmpDir, 'main.py');
      fs.writeFileSync(file, code);
      // Try python3 first, fall back to python
      result = await runShell(`python "${file}"`, { cwd: tmpDir });
      if (result.code === 'ENOENT' || (result.stderr && result.stderr.includes("'python' is not recognized"))) {
        result = await runShell(`python3 "${file}"`, { cwd: tmpDir });
      }

    } else if (language === 'java') {
      const file = path.join(tmpDir, 'Main.java');
      fs.writeFileSync(file, code);
      // Compile
      const compile = await runShell(`javac "${file}"`, { cwd: tmpDir });
      if (compile.stderr && compile.stderr.trim()) {
        return res.json({
          stdout: '',
          stderr: '',
          compile_output: compile.stderr.trim(),
          status: 'Compilation Error',
        });
      }
      // Run
      result = await runShell(`java -cp "${tmpDir}" Main`, { cwd: tmpDir });

    } else if (language === 'cpp') {
      const srcFile = path.join(tmpDir, 'main.cpp');
      const outFile = path.join(tmpDir, os.platform() === 'win32' ? 'main.exe' : 'main');
      fs.writeFileSync(srcFile, code);
      // Compile
      const compile = await runShell(`g++ "${srcFile}" -o "${outFile}"`, { cwd: tmpDir });
      if (compile.stderr && compile.stderr.trim()) {
        // Check if it's a warning-only (compiled successfully) vs actual error
        if (!fs.existsSync(outFile)) {
          return res.json({
            stdout: '',
            stderr: '',
            compile_output: compile.stderr.trim(),
            status: 'Compilation Error',
          });
        }
      }
      // Run
      result = await runShell(`"${outFile}"`, { cwd: tmpDir });

    } else if (language === 'javascript') {
      const file = path.join(tmpDir, 'main.js');
      fs.writeFileSync(file, code);
      result = await runShell(`node "${file}"`, { cwd: tmpDir });

    } else {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    if (result.killed) {
      return res.json({
        stdout: result.stdout,
        stderr: 'Execution timed out (10s limit)',
        compile_output: '',
        status: 'Time Limit Exceeded',
      });
    }

    return res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: '',
      status: result.stderr && !result.stdout ? 'Runtime Error' : 'Accepted',
    });

  } catch (err) {
    console.error('[execute] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal execution error' });
  } finally {
    // Clean up temp directory
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
});

module.exports = router;