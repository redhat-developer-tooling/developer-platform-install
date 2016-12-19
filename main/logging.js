'use strict';

import fs from 'fs';
import path from 'path';

let logFile;

export function init(installRoot, version) {
  logFile = path.join(installRoot, 'install.log');
  log('Development Suite installer v' + version);
}

export function log(message) {
  if (logFile) {
    fs.appendFileSync(
      logFile,
      new Date().toUTCString() + '-' + message + '\r\n'
    );
  }
}
