const { menubar } = require('menubar');
const { app, Menu, shell, dialog, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Configuración de la app de menubar
const mb = menubar({
  index: 'http://localhost:3000',
  icon: path.join(__dirname, 'assets', 'tray-icon.png'),
  tooltip: 'Audio Recorder',
  width: 800,
  height: 600,
  preloadWindow: true,
  showOnAllWorkspaces: false,
  windowPosition: 'trayCenter',
  showDockIcon: false,
  alwaysOnTop: false
});

let serverProcess;

// Iniciar servidor backend
function startServer() {
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
}

// Crear menú contextual
function createContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🎙️ Nueva Grabación',
      accelerator: 'Cmd+Shift+R',
      click: () => {
        mb.window.webContents.send('start-recording');
        mb.showWindow();
      }
    },
    {
      label: '⏹ Detener Grabación',
      accelerator: 'Cmd+Shift+S',
      click: () => {
        mb.window.webContents.send('stop-recording');
      }
    },
    { type: 'separator' },
    {
      label: '📁 Abrir Carpeta de Grabaciones',
      click: () => {
        shell.openPath(path.join(__dirname, 'recordings'));
      }
    },
    {
      label: '📝 Abrir Carpeta de Transcripciones',
      click: () => {
        shell.openPath(path.join(__dirname, 'transcriptions'));
      }
    },
    { type: 'separator' },
    {
      label: '⚙️ Configuración',
      click: () => {
        const envPath = path.join(__dirname, 'backend', '.env');
        shell.openPath(envPath);
      }
    },
    { type: 'separator' },
    {
      label: '🔄 Recargar',
      click: () => {
        mb.window.reload();
      }
    },
    {
      label: '❌ Salir',
      accelerator: 'Cmd+Q',
      click: () => {
        app.quit();
      }
    }
  ]);

  return contextMenu;
}

// Eventos de menubar
mb.on('ready', () => {
  console.log('Audio Recorder Menubar App is ready');
  
  // Iniciar servidor
  startServer();
  
  // Configurar menú contextual
  mb.tray.on('right-click', () => {
    mb.tray.popUpContextMenu(createContextMenu());
  });
  
  // Registrar atajos globales
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    mb.window.webContents.send('start-recording');
    mb.showWindow();
  });
  
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mb.window.webContents.send('stop-recording');
  });
  
  // Mostrar notificación de inicio
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    new Notification({
      title: 'Audio Recorder',
      body: 'La aplicación está lista en la barra de menú',
      icon: path.join(__dirname, 'assets', 'icon.png')
    }).show();
  }
});

mb.on('after-create-window', () => {
  // Configuraciones adicionales de la ventana
  mb.window.setVisualZoomLevelLimits(1, 1);
  mb.window.webContents.on('did-finish-load', () => {
    mb.window.webContents.insertCSS(`
      /* Estilos personalizados para la app de menubar */
      body {
        -webkit-app-region: drag;
        user-select: none;
      }
      button, a, input, textarea {
        -webkit-app-region: no-drag;
        user-select: auto;
      }
      .App-header {
        padding: 1rem;
        font-size: 0.9em;
      }
      .App-header h1 {
        font-size: 1.5rem;
      }
    `);
  });
});

// Limpiar al cerrar
app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Manejar errores
process.on('uncaughtException', (error) => {
  console.error('Error:', error);
  dialog.showErrorBox('Error', error.message);
});