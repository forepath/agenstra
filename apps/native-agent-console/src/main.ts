import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain, Menu } from 'electron';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'node:child_process';
import * as net from 'node:net';
import * as path from 'node:path';

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
/** Resolved in whenReady: from PORT env or a free port. */
let ssrPort = 0;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr !== null && 'port' in addr ? addr.port : 0;
      console.log('[Main Process] Found free port:', port);
      server.close(() => resolve(port));
    });
    server.once('error', reject);
  });
}
let ssrProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// Config file path
const configFilePath = path.join(app.getPath('userData'), 'config.json');

interface AppConfig {
  configUrl?: string;
}

// Read config from file
function readConfig(): AppConfig {
  try {
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf-8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('[Main Process] Error reading config file:', error);
  }
  return {};
}

// Write config to file
function writeConfig(config: AppConfig): void {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Main Process] Error writing config file:', error);
  }
}

// Get current config URL
function getConfigUrl(): string | undefined {
  const config = readConfig();
  return config.configUrl;
}

function startSSRServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    // When packaged, __dirname is inside app.asar, but server is in extraResource (outside asar)
    // So we need to go up from app.asar to resources/, then into server/
    let ssrPath: string;
    if (app.isPackaged && __dirname.includes('.asar')) {
      // Packaged: __dirname = resources/app.asar, server = resources/server/
      const resourcesDir = path.dirname(__dirname); // Go up from app.asar to resources/
      ssrPath = path.join(resourcesDir, 'server', 'server.cjs');
    } else {
      // Development: server is relative to __dirname
      ssrPath = path.join(__dirname, 'server', 'server.cjs');
    }

    const configUrl = getConfigUrl();
    const env: NodeJS.ProcessEnv = { ...process.env, PORT: ssrPort.toString() };

    // Add CONFIG environment variable if config URL is set
    if (configUrl) {
      env.CONFIG = configUrl;
      console.log('[Main Process] Starting SSR server with CONFIG:', configUrl);
    } else {
      console.log('[Main Process] Starting SSR server without CONFIG');
    }

    // When packaged, set NODE_PATH so the spawned server process can find dependencies
    // from the server directory's node_modules (extracted outside asar)
    if (app.isPackaged && __dirname.includes('.asar')) {
      const resourcesDir = path.dirname(__dirname); // resources/
      const serverNodeModules = path.join(resourcesDir, 'server', 'node_modules');
      const existingNodePath = env.NODE_PATH || '';
      env.NODE_PATH = existingNodePath ? `${serverNodeModules}${path.delimiter}${existingNodePath}` : serverNodeModules;
      console.log('[Main Process] Set NODE_PATH to:', env.NODE_PATH);
    }

    ssrProcess = spawn('node', [ssrPath], {
      stdio: 'pipe',
      cwd: path.dirname(ssrPath),
      env,
    });

    ssrProcess.stdout?.on('data', (data) => {
      if (data.toString().includes('Express server running')) resolve();
    });
    ssrProcess.stderr?.on('data', (data) => console.error(`Application server error: ${data}`));

    ssrProcess.once('error', reject);
    setTimeout(() => reject(new Error('Application server startup timeout')), 30000);
  });
}

function getWindowOptions(): BrowserWindowConstructorOptions {
  const preloadPath = path.join(__dirname, 'preload.js');
  return {
    width: 1400,
    height: 900,
    backgroundColor: '#121212',
    show: false,
    autoHideMenuBar: true,
    frame: false,
    title: 'Agenstra Agent Console',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev,
      preload: preloadPath,
    },
  };
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow(getWindowOptions());

  const ssrUrl = `http://localhost:${ssrPort}`;
  mainWindow.loadURL(ssrUrl);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
    ssrProcess?.kill();
  });

  return mainWindow;
}

// Set window open handler for all windows to use getWindowOptions()
app.on('browser-window-created', (_event, window) => {
  window.once('ready-to-show', () => window?.show());

  // Set window icon (handle errors gracefully)
  // On Linux, prefer PNG; on Windows, prefer ICO
  try {
    const iconPath = process.platform === 'win32' ? path.join(__dirname, 'icon.ico') : path.join(__dirname, 'icon.png');

    if (fs.existsSync(iconPath)) {
      window.setIcon(iconPath);
    } else {
      // Fallback to other format
      const fallbackPath =
        process.platform === 'win32' ? path.join(__dirname, 'icon.png') : path.join(__dirname, 'icon.ico');

      if (fs.existsSync(fallbackPath)) {
        window.setIcon(fallbackPath);
      } else {
        console.warn('[Main Process] No icon file found in:', __dirname);
      }
    }
  } catch (error) {
    console.warn('[Main Process] Failed to set window icon:', error instanceof Error ? error.message : String(error));
  }

  // Set window open handler for this window
  window.webContents.setWindowOpenHandler(() => {
    const options = getWindowOptions();

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: options.width,
        height: options.height,
        backgroundColor: options.backgroundColor,
        show: options.show,
        autoHideMenuBar: options.autoHideMenuBar,
        frame: options.frame,
        title: options.title,
        webPreferences: options.webPreferences,
      },
    };
  });
});

// IPC handlers for window controls
ipcMain.handle('window-minimize', (event: any) => {
  console.log('[Main Process] window-minimize IPC received');
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    console.log('[Main Process] Minimizing window');
    window.minimize();
    return true;
  }
  console.error('[Main Process] Window not found for minimize');
  return false;
});

ipcMain.handle('window-maximize', (event: any) => {
  console.log('[Main Process] window-maximize IPC received');
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    if (window.isMaximized()) {
      console.log('[Main Process] Unmaximizing window');
      window.unmaximize();
    } else {
      console.log('[Main Process] Maximizing window');
      window.maximize();
    }
    return true;
  }
  console.error('[Main Process] Window not found for maximize');
  return false;
});

ipcMain.handle('window-close', (event: any) => {
  console.log('[Main Process] window-close IPC received');
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    console.log('[Main Process] Closing window');
    window.close();
    return true;
  }
  console.error('[Main Process] Window not found for close');
  return false;
});

ipcMain.handle('window-is-maximized', (event: any) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window?.isMaximized() ?? false;
});

// IPC handlers for config management
ipcMain.handle('get-config-url', () => {
  return getConfigUrl();
});

ipcMain.handle('set-config-url', async (event: any, url: string | null) => {
  const config = readConfig();
  if (url && url.trim()) {
    config.configUrl = url.trim();
    writeConfig(config);
    console.log('[Main Process] Config URL set to:', config.configUrl);
  } else {
    // Reset config (empty string or null)
    delete config.configUrl;
    writeConfig(config);
    console.log('[Main Process] Config URL reset');
  }

  // Notify the sender that config was set (for dialog to close)
  event.sender.send('config-url-set');

  // Kill SSR server before restarting to ensure clean restart
  if (ssrProcess) {
    console.log('[Main Process] Killing SSR server before restart');
    ssrProcess.kill();
    ssrProcess = null;
  }

  // Restart the application after a short delay
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 100);

  return true;
});

ipcMain.handle('open-config-dialog', async () => {
  console.log('[Main Process] Opening config dialog');
  await showConfigUrlDialog();
  return true;
});

// Show config URL dialog
async function showConfigUrlDialog(): Promise<void> {
  if (!mainWindow) {
    return;
  }

  const currentUrl = getConfigUrl();
  const dialogWindow = new BrowserWindow({
    parent: mainWindow,
    width: 500,
    height: 252,
    modal: true,
    resizable: false,
    frame: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const dialogHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: #1e1e1e;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 5px;
        }
        .current {
          font-size: 12px;
          color: #888;
          margin-bottom: 10px;
          word-break: break-all;
        }
        input {
          width: calc(100% - 20px);
          padding: 10px;
          background: #2d2d2d;
          border: 1px solid #444;
          border-radius: 4px;
          color: #ffffff;
          font-size: 14px;
        }
        input:focus {
          outline: none;
          border-color: #007acc;
        }
        .buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 10px;
        }
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .btn-primary {
          background: #007acc;
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #005a9e;
        }
        .btn-secondary {
          background: #3d3d3d;
          color: #ffffff;
        }
        .btn-secondary:hover {
          background: #4d4d4d;
        }
        .btn-danger {
          background: #d32f2f;
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #b71c1c;
        }
      </style>
    </head>
    <body>
      <div class="title">Configure Server URL</div>
      ${currentUrl ? `<div class="current">Current: ${currentUrl}</div>` : '<div class="current">No URL currently set</div>'}
      <input type="text" id="urlInput" placeholder="https://example.com/config.json" value="${currentUrl || ''}" autofocus>
      <div class="buttons">
        <button class="btn-danger" id="resetBtn">Reset</button>
        <button class="btn-secondary" id="cancelBtn">Cancel</button>
        <button class="btn-primary" id="saveBtn">Save</button>
      </div>
      <script>
        // Wait for preload script to expose electronAPI
        function waitForElectronAPI(callback) {
          if (window.electronAPI) {
            callback();
          } else {
            setTimeout(() => waitForElectronAPI(callback), 50);
          }
        }

        waitForElectronAPI(() => {
          const input = document.getElementById('urlInput');
          const saveBtn = document.getElementById('saveBtn');
          const cancelBtn = document.getElementById('cancelBtn');
          const resetBtn = document.getElementById('resetBtn');

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              saveBtn.click();
            } else if (e.key === 'Escape') {
              cancelBtn.click();
            }
          });

          saveBtn.addEventListener('click', () => {
            const url = input.value.trim();
            window.electronAPI.setConfigUrl(url || '');
          });

          cancelBtn.addEventListener('click', () => {
            window.close();
          });

          resetBtn.addEventListener('click', () => {
            input.value = '';
            input.focus();
          });
        });
      </script>
    </body>
    </html>
  `;

  dialogWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dialogHTML)}`);

  // Dialog will close automatically when app restarts after config is set
}

// Create application menu
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Configure Server URL...',
          accelerator: 'CmdOrCtrl+,',
          click: async () => {
            await showConfigUrlDialog();
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  ssrPort =
    process.env.PORT !== undefined && process.env.PORT !== '' ? parseInt(process.env.PORT, 10) : await getFreePort();
  if (!Number.isInteger(ssrPort) || ssrPort <= 0) {
    ssrPort = await getFreePort();
  }
  createMenu();
  startSSRServer().then(() => {
    createWindow();
  });
});

app.on('before-quit', () => ssrProcess?.kill());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    ssrProcess?.kill();
    app.quit();
  }
});
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
