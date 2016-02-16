'use strict';

let remote = require('remote');
let fs = require('fs');

class ConfirmController {
  constructor($state, installerDataSvc) {
    this.router = $state;
    this.installerDataSvc = installerDataSvc;

    this.folder = installerDataSvc.installDir();
    this.folderExists = false;
  }

  install() {
    //TODO This needs to handle changes to install location, etc

    if (!this.folderExists) {
      fs.mkdirSync(this.folder);
    }
    this.installerDataSvc.setup(this.folder);
    this.router.go('install');
  }

  selectFolder() {
    let dialog = remote.require('dialog');
    let selection = dialog.showOpenDialog({ properties: [ 'openDirectory' ]});

    if (selection) {
      this.folder = selection[0] || this.folder;
    }

    this.checkFolder();
  }

  folderChanged() {
    this.folder = folder.value;
    this.checkFolder()
  }

  checkFolder() {
    try {
      fs.accessSync(this.folder, fs.F_OK);
      this.folderExists = true;
    } catch (err) {
      this.folderExists = false;
    }
  }
}

ConfirmController.$inject = ['$state', 'installerDataSvc'];

export default ConfirmController;
