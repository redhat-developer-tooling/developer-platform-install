'use strict';

let fs = require('fs');
let path = require('path');
import Util from '../../model/helpers/util';
import Logger from '../../services/logger';
import Platform from '../../services/platform';

class LocationController {
  constructor($scope, $state, $timeout, installerDataSvc, electron) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.folder = installerDataSvc.installDir();
    this.folderExists = false;
    this.nonasciichars = false;
    this.installables = {};
    $scope.checkboxModel = {};
    this.electron = electron;
  }

  confirm() {
    this.installerDataSvc.installRoot = this.folder;
    for (var [, value] of this.installerDataSvc.allInstallables().entries()) {
      value.setOptionLocation('install', path.join(this.folder, value.targetFolderName));
    }
    this.router.go('confirm');
  }

  selectFolder() {
    let selection = this.electron.remote.dialog.showOpenDialog(
      this.electron.remote.getCurrentWindow(), {
        properties: ['openDirectory'],
        defaultPath: this.folder
      });
    this.installerDataSvc.installRoot = this.folder;
    if (selection) {
      this.folder = selection[0] || this.folder;
    }

    this.checkFolder();
  }

  checkUserProfilestatus() {
    return new Promise((resolve, reject)=> {
      if (Platform.OS === 'win32') {
        Util.executeCommand('echo %USERPROFILE%',1).then((path)=>{
          let nonAsciiRegex = /[^\x00-\x7F]+/;
          if(nonAsciiRegex.test(path)) {
            this.nonasciichars = true;
          } else {
            this.nonasciichars = false;
          }
        });
      } else {
        resolve();
      }
    });
  }

  checkFolder() {
    try {
      fs.accessSync(this.folder, fs.F_OK);
      this.folderExists = true;
    } catch (err) {
      this.folderExists = false;
    }
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.installerDataSvc.installRoot = this.folder;
    this.router.go('account');
  }

}

LocationController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default LocationController;
