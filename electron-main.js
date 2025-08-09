const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow;
let serverProcess;
let tray;

// Función para iniciar el servidor backend
function startBackendServer() {
  const serverPath = path.join(__dirname, 'backend', 'server.js');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: '5001' },
    cwd: path.join(__dirname, 'backend')
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
}

// Función para crear la ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#667eea',
    show: false
  });

  // Cargar la aplicación
  const startUrl = isDev 
    ? 'http://localhost:4444' 
    : `file://${path.join(__dirname, 'frontend/build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Función para crear tray icon
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
      label: 'Iniciar Grabación',
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

// Función para crear menú de aplicación
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
        { label: 'Nueva Grabación', accelerator: 'Cmd+N', click: () => {
          if (mainWindow) mainWindow.webContents.send('start-recording');
        }},
        { label: 'Detener Grabación', accelerator: 'Cmd+S', click: () => {
          if (mainWindow) mainWindow.webContents.send('stop-recording');
        }},
        { type: 'separator' },
        { label: 'Importar Audio...', click: () => {
          // Implementar importación
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
        { label: 'Documentación', click: () => {
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

// Eventos de la aplicación
app.whenReady().then(() => {
  startBackendServer();
  
  // Esperar un poco para que el servidor inicie
  setTimeout(() => {
    createWindow();
    createTray();
    createMenu();
  }, 2000);
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