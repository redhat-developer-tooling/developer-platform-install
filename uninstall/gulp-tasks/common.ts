'use strict';

let path = require('path'),
  fs = require('fs-extra');

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


module.exports = {
  createExecCallback
};
