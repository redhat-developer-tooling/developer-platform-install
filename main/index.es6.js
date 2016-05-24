'use strict';

import { app, ipcMain, BrowserWindow, crashReporter } from 'electron';
import fs from 'fs';
import os from 'os';
import * as logger from './logging';

// Report crashes to our server.
crashReporter.start({
  productName: 'Development Suite Install',
  companyName: 'Red Hat',
  autoSubmit: true
});

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
})

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    'autoHideMenuBar': true
  });

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/../browser/index.html');

  if( process.env['PDKI_DEBUG'] !== undefined ) {
    mainWindow.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
