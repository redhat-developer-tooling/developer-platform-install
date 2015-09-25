let app = require('app');  // Module to control application life.
let ipc = require('ipc');
let crashReporter = require('crash-reporter');
let BrowserWindow = require('browser-window');  // Module to create native browser window.

// Report crashes to our server.
crashReporter.start({
  productName: 'Developer Platform Install',
  companyName: 'Red Hat',
  autoSubmit: true
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

ipc.on('install', (event) => {
  event.sender.send('install-complete');
});

ipc.on('crash', (event, arg) => {
  process.crash(arg);
});

ipc.on('devTools', (event,arg) => {
  mainWindow.openDevTools();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 500});

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/../browser/index.html');

  //mainWindow.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
