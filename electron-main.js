const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

// Detectar si estamos en desarrollo:
// - Si ELECTRON_IS_DEV est\u00e1 definido, usarlo
// - Si no, verificar si estamos en una app empaquetada (.app)
const isDev = process.env.ELECTRON_IS_DEV === '1' ||
              process.env.NODE_ENV === 'development' ||
              !app.isPackaged;

let mainWindow;
let serverProcess;
let tray;

// Funci\u00f3n para obtener el directorio de datos (writable)
function getDataDir() {
  if (isDev) {
    return null; // En dev, el backend usa sus rutas relativas normales
  }
  // En producci\u00f3n, usar ~/Library/Application Support/Audio Recorder/
  return app.getPath('userData');
}

// Leer la API key desde el .env copiado a extraResources
function loadEnvApiKey() {
  if (isDev) return {};

  const envPath = path.join(process.resourcesPath, '.env');
  const env = {};

  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        env[key] = value;
      }
    } else {
      console.warn('.env file not found at:', envPath);
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }

  return env;
}

// Funci\u00f3n para iniciar el servidor backend
function startBackendServer() {
  let serverPath;
  let cwd;

  if (isDev) {
    serverPath = path.join(__dirname, 'backend', 'server.js');
    cwd = path.join(__dirname, 'backend');
  } else {
    // En producci\u00f3n, el backend est\u00e1 en Resources/backend/ gracias a extraResources
    serverPath = path.join(process.resourcesPath, 'backend', 'server.js');
    cwd = path.join(process.resourcesPath, 'backend');
  }

  console.log('Backend server path:', serverPath);
  console.log('Backend cwd:', cwd);
  console.log('Server file exists:', fs.existsSync(serverPath));

  // Cargar variables del .env de extraResources
  const envVars = loadEnvApiKey();
  const dataDir = getDataDir();

  // Asegurar que el directorio de datos existe en producci\u00f3n
  if (dataDir) {
    const recordingsDir = path.join(dataDir, 'recordings');
    const transcriptionsDir = path.join(dataDir, 'transcriptions');
    if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });
    if (!fs.existsSync(transcriptionsDir)) fs.mkdirSync(transcriptionsDir, { recursive: true });
  }

  const spawnEnv = {
    ...process.env,
    PORT: '5001',
    ...envVars
  };

  if (dataDir) {
    spawnEnv.DATA_DIR = dataDir;
  }

  serverProcess = spawn('node', [serverPath], {
    env: spawnEnv,
    cwd: cwd
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server process:', error);
  });
}

// Esperar a que el backend responda en /health
function waitForBackend(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    function poll() {
      if (Date.now() > deadline) {
        return reject(new Error('Backend health check timed out'));
      }

      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(poll, 300);
        }
      });

      req.on('error', () => {
        setTimeout(poll, 300);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(poll, 300);
      });
    }

    poll();
  });
}

// Funci\u00f3n para crear la ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#ffffff',
    show: true,
    center: true,
    resizable: true
  });

  // Cargar la aplicaci\u00f3n
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'frontend/build/index.html')}`;

  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('File exists:', fs.existsSync(path.join(__dirname, 'frontend/build/index.html')));

  mainWindow.loadURL(startUrl);

  // DevTools: solo abrir manualmente con Cmd+Option+I si se necesita

  // Eventos de depuraci\u00f3n
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    mainWindow.show();
    mainWindow.focus();
  });

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Funci\u00f3n para crear tray icon
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Iniciar Grabaci\u00f3n',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('start-recording');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Audio Recorder');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// Funci\u00f3n para crear men\u00fa de aplicaci\u00f3n
function createMenu() {
  const template = [
    {
      label: 'Audio Recorder',
      submenu: [
        { label: 'Acerca de Audio Recorder', role: 'about' },
        { type: 'separator' },
        { label: 'Preferencias...', accelerator: 'Cmd+,', click: () => {
          // Abrir ventana de preferencias
        }},
        { type: 'separator' },
        { label: 'Salir', accelerator: 'Cmd+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Archivo',
      submenu: [
        { label: 'Nueva Grabaci\u00f3n', accelerator: 'Cmd+N', click: () => {
          if (mainWindow) mainWindow.webContents.send('start-recording');
        }},
        { label: 'Detener Grabaci\u00f3n', accelerator: 'Cmd+S', click: () => {
          if (mainWindow) mainWindow.webContents.send('stop-recording');
        }},
        { type: 'separator' },
        { label: 'Importar Audio...', click: () => {
          // Implementar importaci\u00f3n
        }}
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Copiar', accelerator: 'Cmd+C', role: 'copy' },
        { label: 'Pegar', accelerator: 'Cmd+V', role: 'paste' },
        { label: 'Seleccionar Todo', accelerator: 'Cmd+A', role: 'selectall' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Forzar Recarga', accelerator: 'Cmd+Shift+R', role: 'forcereload' },
        { type: 'separator' },
        { label: 'Pantalla Completa', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { label: 'Minimizar', accelerator: 'Cmd+M', role: 'minimize' },
        { label: 'Cerrar', accelerator: 'Cmd+W', role: 'close' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Documentaci\u00f3n', click: () => {
          require('electron').shell.openExternal('https://github.com/tu-usuario/audio-recorder');
        }},
        { label: 'Reportar un Problema', click: () => {
          require('electron').shell.openExternal('https://github.com/tu-usuario/audio-recorder/issues');
        }}
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos de la aplicaci\u00f3n
app.whenReady().then(async () => {
  // Solo iniciar el servidor backend en producci\u00f3n
  // En desarrollo, el backend ya est\u00e1 corriendo por npm run dev-backend
  if (!isDev) {
    startBackendServer();
    // Esperar a que el backend responda al health check (m\u00e1ximo 15 segundos)
    try {
      console.log('Waiting for backend to be ready...');
      await waitForBackend('http://localhost:5001/health', 15000);
      console.log('Backend is ready');
    } catch (error) {
      console.error('Backend failed to start:', error.message);
      // Continuar de todos modos para mostrar la ventana con un posible error
    }
    createWindow();
    createTray();
    createMenu();
  } else {
    // En desarrollo, crear ventana inmediatamente
    createWindow();
    createTray();
    createMenu();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Detener el servidor backend
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
