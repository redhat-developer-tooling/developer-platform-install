'use strict';
import { app, ipcMain, BrowserWindow, dialog, Menu, globalShortcut } from 'electron';
import * as logger from './logging';
import template from './menu';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

ipcMain.on('crash', function(event, arg) {
  process.crash(arg);
});

// Rebroadcasts installComplete event from Renderer back to Renderer.
// Bit of a hack, but it enables async messaging in UI.
ipcMain.on('installComplete', (event, arg) => {
  event.sender.send('installComplete', arg);
});

ipcMain.on('downloadingComplete', (event, arg) => {
  event.sender.send('downloadingComplete', arg);
});

ipcMain.on('checkComplete', (event, arg) => {
  event.sender.send('checkComplete', arg);
});


// Setup logging listeners
ipcMain.on('install-root', (event, installRoot) => {
  logger.init(installRoot, app.getVersion());
});

ipcMain.on('log', (event, arg) => {
  logger.log(arg);
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});

// Quit when all windows are closed.
app.on('quit', function(event, exitCode) {
  logger.log('INFO: Exit Code = ' + exitCode);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

  app.on('browser-window-focus', () => {
    globalShortcut.register('CmdOrCtrl+W', ()=>{
      let focusedWindow = BrowserWindow.getFocusedWindow();
      if(focusedWindow) {
        focusedWindow.close();
      }
    });
  });

  app.on('browser-window-blur', () => {
    globalShortcut.unregisterAll();
  });

  // Create the browser window.
  mainWindow = new BrowserWindow({
    useContentSize: true,
    width: 1010,
    height: 650,
    'autoHideMenuBar': true,
    resizable: false,
    show: false
  });

  if (process.platform === 'darwin') {
    template[0].label = app.getName();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  // Some processing is required to make sure local file can be opened in browser
  // windows allows # in names and it should be replaced with ASCII encoding.
  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the index.html of the app
  mainWindow.loadURL(`file://${baseLocation}/../browser/index.html`);

  // only for windows where 7zip pass location where self extracting archive
  // was unpacked
  if (process.platform === 'win32') {
    mainWindow.bundleTempFolder = process.argv.length > 1 ? process.argv[1].replace(/^--/, '') : undefined;
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.on('close', function(e) {
    let opt = {
      type: 'none',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      cancelId: 1,
      message: 'Are you sure you want to close the installer?'
    };
    if (dialog.showMessageBox(mainWindow, opt)) {
      e.preventDefault();
    }
  });
});

function openAboutWindow() {

  let aboutWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    useContentSize: true,
    width: 565,
    height: 355,
    'autoHideMenuBar': true,
    resizable: false,
    show: false
  });
  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the about.html of the app
  aboutWindow.loadURL(`file://${baseLocation}/../browser/about.html`);
  aboutWindow.setMenu(null);
  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });
}

export default openAboutWindow;
