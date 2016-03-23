'use strict';

let dialog = require('remote').require('dialog');
let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

class ConfirmController {
  constructor($scope, $state, installerDataSvc) {
    this.router = $state;
    this.installerDataSvc = installerDataSvc;
    this.sc = $scope;

    this.folder = installerDataSvc.installDir();
    this.folderExists = false;
    this.installables = new Object();
    
    $scope.checkboxModel = {
      cdk : installerDataSvc.getInstallable('cdk'),
      jdk : installerDataSvc.getInstallable('jdk'),
      jbds : installerDataSvc.getInstallable('jbds'),
      vbox : installerDataSvc.getInstallable('virtualbox'),
      vag : installerDataSvc.getInstallable('vagrant'),
    };

  }

  install() {
    //for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
    //  value.useDownload = !value.existingInstall;
    //}

    this.checkFolder();
    if (!this.folderExists) {
      fs.mkdirSync(this.folder);
    }

    this.installerDataSvc.setup(this.folder,
      this.itemRoot('virtualbox'),
      this.itemRoot('jdk'),
      this.itemRoot('jbds'),
      this.itemRoot('vagrant'),
      this.itemRoot('cygwin'),
      this.itemRoot('cdk')
    );
    this.router.go('install');
  }

  selectItem(key) {
    let selection = dialog.showOpenDialog({
      properties: [ 'openDirectory' ],
      defaultPath: this.installables[key] && this.installables[key][0].existingInstallLocation ? this.installables[key][0].existingInstallLocation : this.installerDataSvc.installRoot
    });
    let item = this.installerDataSvc.allInstallables().get(key);

    if (selection) {
      item.checkForExistingInstall(selection, this.installables);
    }
  }

  checkItem(key) {
    let item = this.installerDataSvc.allInstallables().get(key);
    item.checkForExistingInstall();

    ipcRenderer.on('checkComplete', (event, arg) => {
      if (arg === key) {
          this.installables[key] = [item, item.existingInstall];
        this.sc.$digest();
      }
    });
  }

  selectFolder() {
    let selection = dialog.showOpenDialog({
      properties: [ 'openDirectory' ],
      defaultPath: this.folder
    });

    if (selection) {
      this.folder = selection[0] || this.folder;
    }

    this.checkFolder();
  }

  checkFolder() {
    try {
      fs.accessSync(this.folder, fs.F_OK);
      this.folderExists = true;
    } catch (err) {
      this.folderExists = false;
    }
  }

  folderChanged() {
    this.folder = folder.value;
    this.checkFolder()
  }

  itemRoot(key) {
    let root = this.installables[key] ? this.installables[key][0].existingInstallLocation : null;
    if (root && (root.length === 0 || !this.installables[key][0].existingInstall)) {
      root = null;
    }
    return root;
  }
}

ConfirmController.$inject = ['$scope', '$state', 'installerDataSvc'];

export default ConfirmController;
