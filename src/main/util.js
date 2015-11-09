'use strict';

var child_process = require('child_process');

module.exports = {
  execFile : function (file, args, callback) {
    child_process.execFile(file, args, function(error, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      callback();
    });
  }
};
