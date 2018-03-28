'use strict';

var ipcRenderer = require('electron').ipcRenderer;
var ipcRendererStub = { send: function() {} };

class Logger {

  static initialize(installRoot) {
    Logger.getIpcRenderer().send('install-root', installRoot);
  }

  static log(msg) {
    Logger.getIpcRenderer().send('log', msg);
  }

  static info(msg) {
    Logger.log('INFO: ' + msg);
  }

  static error(msg) {
    Logger.log('ERROR: ' + msg);
  }

  static getIpcRenderer() {
    return ipcRenderer? ipcRenderer : ipcRendererStub;
  }
}

export default Logger;
