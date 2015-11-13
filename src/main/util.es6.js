'use strict';

import child_process from 'child_process';

export default function execFile(file, args, success, failure) {
  child_process.execFile(file, args, function(error, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    if (stderr) {
      return failure();
    }
    success();
  });
}
