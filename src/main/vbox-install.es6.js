'use strict';

import fs from 'fs';
import request from 'request';
import execFile from './util.js';
import path from 'path';

export default function installVirtualBox(installRoot, tmpDir, url, callback) {
  var vboxDownload = path.join(tmpDir, 'virtualBox.exe');

  request
    .get(url)
    .on('error', function(err) {
      console.log(err)
    })
    .pipe(fs.createWriteStream(vboxDownload))
    .on('close', function() {
      execFile(
        vboxDownload,
        ['--extract',
          '-path',
          tmpDir,
          '--silent'],
        function() {
          execFile(
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
