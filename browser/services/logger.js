'use strict';

let ipcRenderer = require('electron').ipcRenderer;

class Logger {
  constructor() {
  }

  static initialize(installRoot) {
    ipcRenderer.send('install-root', installRoot);
  }

  static log(msg) {
    ipcRenderer.send('log', msg);
  }

  static info(msg) {
    Logger.log('INFO: ' + msg);
  }

  static error(msg) {
    Logger.log('ERROR: ' + msg)
  }
}

export default Logger;
