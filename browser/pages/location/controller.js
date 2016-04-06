'use strict';

let dialog = require('remote').require('dialog');
let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

class LocationController {
  constructor($scope, $state, $timeout, installerDataSvc) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.folder = installerDataSvc.installDir();
    this.folderExists = false;
    this.installables = new Object();
    $scope.checkboxModel = new Object();
    $scope.detectionStyle = false;

  }

  confirm() {
    this.installerDataSvc.installRoot = this.folder;
    this.router.go('confirm');
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
}

LocationController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc'];

export default LocationController;
