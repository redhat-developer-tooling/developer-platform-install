'use strict';

import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

let logFile = null;

export function init(installRoot, version) {
  logFile = path.join(installRoot, 'install.log');
  log('Development Suite installer v' + version);
}

export function log(message) {
  if (logFile == null) {
    return;
  }

  fs.appendFileSync(
    logFile,
    new Date().toUTCString() + '-' + message + '\r\n'
  );
}
