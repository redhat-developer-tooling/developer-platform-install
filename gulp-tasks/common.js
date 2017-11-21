'use strict';

let path = require('path'),
  fs = require('fs-extra');

import Hash from '../browser/model/helpers/hash';

// Create default callback for exec
function createExecCallback(cb, quiet) {
  return function(err, stdout, stderr) {
    if (!quiet) {
      console.log(stdout);
    }
    console.log(stderr);
    cb(err);
  };
}

// for a given filename, return the sha256sum
function getSHA256(filename, cb) {
  new Hash().SHA256(filename, cb);
}

// writes to {filename}.sha256, eg., 6441cde1821c93342e54474559dc6ff96d40baf39825a8cf57b9aad264093335 requirements.json
function createSHA256File(filename, cb) {
  getSHA256(filename, function(hashstring) {
    fs.writeFile(filename + '.sha256', hashstring + ' *' + path.parse(filename).base, (err)=>{
      cb(err);
    });
  });
}

// read the existing .sha256 file and compare it to the existing file's SHA
function isExistingSHA256Current(currentFile, sha256sum, processResult) {
  if (fs.existsSync(currentFile)) {
    console.log('[INFO] \'' + currentFile + '\' exists in cache');
    getSHA256(currentFile, function(hashstring) {
      if (sha256sum !== hashstring) {
        console.log('[WARN] SHA256 in requirements.json (' + sha256sum + ') does not match computed SHA (' + hashstring + ') for ' + currentFile);
      }
      processResult(sha256sum === hashstring);
    });
  } else {
    processResult(false);
  }
}

module.exports = {
  createExecCallback,
  getSHA256,
  createSHA256File,
  isExistingSHA256Current
};
