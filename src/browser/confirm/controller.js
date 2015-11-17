'use strict';

let ipc = require('ipc');

class ConfirmController {
  constructor($state, installerDataSvc) {
    this.router = $state;
    this.installerDataSvc = installerDataSvc;
  }

  install() {
    this.router.go('install');

    this.installerDataSvc.allInstallables().forEach((value, key, map) => {
      if (value.isDownloadRequired() && !value.isDownloaded()) {
        this.installerDataSvc.startDownload(key);
        value.downloadInstaller(() => {
          this.installerDataSvc.downloadDone(key);
        });
      } else if (!value.hasExistingInstall()) {
        this.installerDataSvc.startInstall(key);
        value.install(() => {
          this.installerDataSvc.installDone(key);
        });
      }
    });
  }
}

ConfirmController.$inject = ['$state', 'installerDataSvc'];

export default ConfirmController;
