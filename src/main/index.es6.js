'use strict';

var app = require('app'); // Module to control application life.
var ipc = require('ipc');
var fs = require('fs');
var crashReporter = require('crash-reporter');
var BrowserWindow = require('browser-window'); // Module to create native browser window.
var jdkInstall = require('./jdk-install');

// Report crashes to our server.
crashReporter.start({
  productName: 'Developer Platform Install',
  companyName: 'Red Hat',
  autoSubmit: true
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

ipc.on('install', function(event) {
  var installRoot;
  if (process.platform === 'win32') {
    installRoot = 'c:\\DeveloperPlatform';
  } else {
    installRoot = process.env.HOME + '/DeveloperPlatform';
  }

  jdkInstall(installRoot, __dirname + '/../installs/jdk/openjdk8-win-8u60-b24-x86_64.zip',
    function(err) {
      console.log(err);
    });
  event.sender.send('install-complete');
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

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
