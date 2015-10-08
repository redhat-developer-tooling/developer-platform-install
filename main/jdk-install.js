'use strict';

var AdmZip = require('adm-zip');
var fs = require('fs');

module.exports = function(installRoot, zipPath, callback) {
  var jdkInstallationZip = new AdmZip(zipPath);
  jdkInstallationZip.extractAllTo(installRoot, true);

  fs.readdir(installRoot, function(err, fileList) {
    if (err) { callback(err); }

    for (let dirName of fileList) {
      if (dirName.startsWith('openjdk')) {
        return fs.rename(installRoot + '/' + dirName, installRoot + '/jdk', function(err) {
          if (err) { callback(err); }
          else callback();
        });
      } else {
        continue;
      }
    }
    callback('Extracted zip did not create directory with name starting "openjdk"');
  })
};
