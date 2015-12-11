'use strict';

import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

let logFile = null;

export function init(installRoot) {
  logFile = path.join(installRoot, 'install.log');
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
