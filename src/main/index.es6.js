'use strict';

import app from 'app'; // Module to control application life.
import ipc from 'ipc';
import fs from 'fs';
import os from 'os';
import crashReporter from 'crash-reporter';
import BrowserWindow from 'browser-window'; // Module to create native browser window.

import jdkInstall from './jdk-install';
import VirtualBoxInstall from './vbox-install';

// Report crashes to our server.
crashReporter.start({
  productName: 'Developer Platform Install',
  companyName: 'Red Hat',
  autoSubmit: true
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

let installableItems = new Set();
const tempDir = os.tmpdir();

let installRoot;
if (process.platform === 'win32') {
  installRoot = 'c:\\DeveloperPlatform';
} else {
  installRoot = process.env.HOME + '/DeveloperPlatform';
}

installableItems.add(
  new VirtualBoxInstall('5.0.8',
                        '103449',
                        installRoot,
                        tempDir,
                        'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe',
                        null)
);

ipc.on('install', function(event) {
  installableItems.forEach(value => {
    value.downloadInstaller(() => {
      value.install(() => {
        event.sender.send('install-complete');
      },
      (error) => {
        console.log(error);
      });
    },
    (error) => {
      console.log(error);
    });
  });
});

ipc.on('crash', function(event, arg) {
  process.crash(arg);
});

ipc.on('devTools', function(event, arg) {
  mainWindow.openDevTools();
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
    width: 1000,
    height: 600,
    'auto-hide-menu-bar': true
  });

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/../browser/index.html');

  //mainWindow.openDevTools();

  installableItems.forEach(value => {
    value.checkForExistingInstall();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
