'use strict';

var fs = require('fs');
var request = require('request');
var util = require('./util.js');
var path = require('path');

module.exports = function(installRoot, tmpDir, url, callback) {
  var vboxDownload = path.join(tmpDir, 'virtualBox.exe');

  request
    .get(url)
    .on('error', function(err) {
      console.log(err)
    })
    .pipe(fs.createWriteStream(vboxDownload))
    .on('close', function() {
      util.execFile(
        vboxDownload,
        ['--extract',
          '-path',
          tmpDir,
          '--silent'],
        function() {
          util.execFile(
            'msiexec',
            [
              '/i',
              path.join(tmpDir, '/VirtualBox-5.0.8-r103449-MultiArch_amd64.msi'),
              'INSTALLDIR=' + path.join(installRoot, '/VirtualBox'),
              '/quiet',
              '/passive',
              '/norestart'
            ],
            function() {
              callback();
            }
          );
        });
    });
};
