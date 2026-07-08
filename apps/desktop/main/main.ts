import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Persistent log file (survives crashes on the target machine) ─────────────
let logStream: fs.WriteStream | null = null;

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { logStream?.write(line + '\n'); } catch (_) {}
}

function openLogStream() {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'medingen-startup.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    log(`\n${'='.repeat(60)}`);
    log('Medingen Pharmacy — Application Started');
    log(`Log file: ${logPath}`);
  } catch (e: any) {
    console.error('[Electron] Failed to open log file:', e.message);
  }
}

// ── Backend readiness probe ──────────────────────────────────────────────────
async function waitForBackend(url: string, timeoutMs = 20000): Promise<boolean> {
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < timeoutMs) {
    attempts++;
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume(); // drain
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(new Error('Probe timeout')); });
        req.end();
      });
      log(`[Electron] Backend Ready — responded after ${attempts} attempt(s) in ${Date.now() - start}ms`);
      return true;
    } catch (_) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  log(`[Electron] Backend Failed — never responded after ${timeoutMs}ms (${attempts} attempts)`);
  return false;
}

// ── Resolve the backend path robustly ────────────────────────────────────────
function resolveBackendPath(): { serverPath: string; nodeModulesPath: string } {
  // In packaged mode __dirname is inside app.asar → rewrite to app.asar.unpacked
  let base = __dirname.includes('app.asar')
    ? __dirname.replace(/app\.asar([/\\])/g, 'app.asar.unpacked$1')
    : __dirname;

  const serverPath = path.join(base, '../server/dist/main.js');
  const nodeModulesPath = path.join(base, '../node_modules');
  return { serverPath, nodeModulesPath };
}

// ── Start the embedded NestJS backend ────────────────────────────────────────
function startLocalServer() {
  if (isDev) {
    log('[Electron] Running in DEV mode — backend managed externally');
    return;
  }

  const { serverPath, nodeModulesPath } = resolveBackendPath();

  log('[Electron] ── Backend Startup Diagnostics ──');
  log(`[Electron] __dirname          = ${__dirname}`);
  log(`[Electron] Backend Path       = ${serverPath}`);
  log(`[Electron] Node Modules Path  = ${nodeModulesPath}`);

  // ── File existence checks ─────────────────────────────────────────────────
  const criticalFiles = [
    serverPath,
    path.join(nodeModulesPath, '@nestjs/core/package.json'),
    path.join(nodeModulesPath, '@nestjs/common/package.json'),
    path.join(nodeModulesPath, 'rxjs/package.json'),
    path.join(nodeModulesPath, 'reflect-metadata/Reflect.js'),
    path.join(nodeModulesPath, '.prisma/client/query_engine-windows.dll.node'),
  ];
  let allExist = true;
  for (const f of criticalFiles) {
    const exists = fs.existsSync(f);
    let size = 'N/A';
    if (exists) { try { size = fs.statSync(f).size + ' bytes'; } catch (_) {} }
    log(`[Electron] ${exists ? '✓' : '✗'} ${path.basename(f)} — Exists: ${exists}, Size: ${size}`);
    if (!exists) allExist = false;
  }

  if (!allExist) {
    log('[Electron] CRITICAL: One or more required server files are missing!');
    log('[Electron] The installer was built without unpacking NestJS dependencies from app.asar.');
    log('[Electron] Please rebuild with updated electron-builder.json asarUnpack settings.');
  }

  log('[Electron] Starting Backend...');

  try {
    // Use `spawn node` instead of `fork` so that NODE_PATH is fully honoured
    const nodeExe = process.execPath; // Electron's bundled Node.js binary
    serverProcess = spawn(nodeExe, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NODE_PATH: nodeModulesPath,
        JWT_SECRET: process.env.JWT_SECRET || 'medingen-pharmacy-local-jwt-secret-key-2024-stable',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/medingen_local?schema=public',
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Do NOT detach — we want to control the lifetime
    });

    if (serverProcess.pid) {
      log(`[Electron] Backend PID = ${serverProcess.pid}`);
    } else {
      log('[Electron] Spawn Failed — no PID returned');
    }

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const str = data.toString().trim();
      if (str) log(`[SERVER] ${str}`);
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      const str = data.toString().trim();
      if (str) log(`[SERVER ERR] ${str}`);
    });

    serverProcess.on('error', (err: Error) => {
      log(`[Electron] Spawn Error: ${err.message}`);
    });

    serverProcess.on('exit', (code: number | null, signal: string | null) => {
      log(`[Electron] Backend Exited — code=${code} signal=${signal}`);
      if (code !== 0 && code !== null) {
        log('[Electron] Backend crashed. Check [SERVER ERR] lines above for the stack trace.');
      }
    });
  } catch (err: any) {
    log(`[Electron] FATAL: Failed to spawn backend process: ${err.message}`);
    log(err.stack || '');
  }
}

// ── Create the renderer window ───────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Show only after backend is confirmed ready
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/out/index.html'));
    // Uncomment next line for production debugging on target machine:
    // mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.on('ready', async () => {
  openLogStream();
  startLocalServer();

  if (!isDev) {
    log('[Electron] Waiting for localhost:3001 to be ready...');
    const ready = await waitForBackend('http://localhost:3001/diagnostics/health', 20000);

    if (ready) {
      log('[Electron] Backend Ready ✓ — Loading renderer window');
    } else {
      log('[Electron] Backend Failed ✗ — Loading renderer anyway (will show connectivity error)');
    }
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    log('[Electron] Terminating embedded NestJS server...');
    serverProcess.kill('SIGTERM');
  }
  logStream?.end();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
