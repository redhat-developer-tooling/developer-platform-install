'use strict';

import os from 'os';

const tempDir = os.tmpdir();

let installRoot;
if (process.platform === 'win32') {
  installRoot = 'c:\\DeveloperPlatform';
} else {
  installRoot = process.env.HOME + '/DeveloperPlatform';
}

exports.installRoot = function() {
  return installRoot;
}

exports.tempDir = function() {
  return tempDir;
}
