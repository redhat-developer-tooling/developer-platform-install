'use strict';
import { app, ipcMain, BrowserWindow, dialog, Menu, globalShortcut } from 'electron';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

ipcMain.on('crash', function(event, arg) {
  process.crash(arg);
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    useContentSize: true,
    width: 1010,
    height: 650,
    'autoHideMenuBar': true,
    resizable: false,
    show: false
  });
  // Some processing is required to make sure local file can be opened in browser
  // windows allows # in names and it should be replaced with ASCII encoding.
  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the index.html of the app
  mainWindow.loadURL(`file://${baseLocation}/../browser/index.html`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
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
