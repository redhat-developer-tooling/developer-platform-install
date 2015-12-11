'use strict';

let unzip = require('unzip');
let request = require('request');
let path = require('path');
let fs = require('fs-extra');

import InstallableItem from './installable-item';
import Downloader from './handler/downloader';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'vagrant.zip');
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading Vagrant');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);
    let downloadSize = 160015744;

    let downloader = new Downloader(progress, success, failure, downloadSize);
    downloader.setWriteStream(writeStream);
    downloader.download(this.downloadUrl);
  }

  install(progress, success, failure) {
    progress.setDesc('Installing Vagrant');

    fs.createReadStream(this.downloadedFile)
      .pipe(unzip.Extract({path: this.installerDataSvc.tempDir()}))
      .on('close', () => {
        let vagrantExploded = path.join(this.installerDataSvc.tempDir(), 'vagrant-distribution-1.7.4', 'windows-64');

        fs.move(vagrantExploded, this.installerDataSvc.vagrantDir(), (err) => {
          if (err) return failure(err);

          // Set required paths
          let data = [
            '$vagrantPath = "' + path.join(this.installerDataSvc.vagrantDir(), 'bin') + '"',
            '$mingwPath = "' + path.join(this.installerDataSvc.vagrantDir(), 'mingw', 'bin') + '"',
            '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
            '[Environment]::SetEnvironmentVariable("Path", "$vagrantPath;$mingwPath;$oldPath", "User");',
            '[Environment]::Exit(0)'
          ].join('\r\n');
          fs.writeFileSync(this.vagrantPathScript, data);

          require('child_process')
            .exec(
              [
                'setx RUBYLIB "' + path.join(this.installerDataSvc.vagrantDir(), 'lib', 'ruby', '2.1.0') + '"',
                'setx GEM_HOME "' + path.join(this.installerDataSvc.vagrantDir(), 'lib', 'ruby', 'gems') + '"'
              ].join(' && '),
              (error, stdout, stderr) => {
                console.log(stdout);
                console.log(stderr);
                if (error !== null) {
                  failure(error);
                }

                require('child_process')
                  .execFile(
                    'powershell',
                    [
                      '-ExecutionPolicy',
                      'ByPass',
                      '-File',
                      this.vagrantPathScript
                    ],
                    (error, stdout, stderr) => {
                      console.log(stdout);
                      console.log(stderr);
                      if (error !== null) {
                        failure(error);
                      }

                      progress.setComplete("Complete");
                      success();
                    }
                  );
              }
            );
        });
      });
  }
}

export default VagrantInstall;
