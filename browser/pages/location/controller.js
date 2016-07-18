'use strict';

let remote = require('electron').remote;
let dialog = remote.dialog;
let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import Logger from '../../services/logger';
import Util from '../../model/helpers/util';

class LocationController {
  constructor($scope, $state, $timeout, installerDataSvc) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;

    this.folder = installerDataSvc.installDir();
    this.folderExists = false;
    this.installables = {};
    $scope.checkboxModel = {};
    this.showCloseDialog = false;
    this.vagrantHomeHasSpace = true;
  }

  confirm() {
    this.installerDataSvc.installRoot = this.folder;
    for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
      value.setOptionLocation('install',path.join(this.folder,value.targetFolderName));
    }
    this.router.go('confirm');
  }

  selectFolder() {
    let selection = dialog.showOpenDialog(
      remote.getCurrentWindow(),{
      properties: [ 'openDirectory' ],
      defaultPath: this.folder
    });
    this.installerDataSvc.installRoot = this.folder;

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
    this.checkFolder()
  }

  exit() {
    Logger.info('Closing the installer window');
    remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.installerDataSvc.installRoot = this.folder;
    this.router.go('account');
  }

  setCloseDialog () {
    this.showCloseDialog = !this.showCloseDialog;
  }

  checkUserProfileLocation() {

    Util.executeCommand('echo %USERPROFILE%',1).then((profile)=>{
      if(profile.includes(' ') ) {
        Util.executeCommand('echo %VAGRANT_HOME%').then((vagrantHome)=>{
          if(vagrantHome==='%VAGRANT_HOME%') {
            this.vagrantHomeHasSpace = true;
          } else {
            this.vagrantHomeHasSpace = false;
          }
          this.sc.$apply();
        })
      } else {
        this.vagrantHomeHasSpace = false;
        this.sc.$apply();
      }
    })
  }
}

LocationController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc'];

export default LocationController;
