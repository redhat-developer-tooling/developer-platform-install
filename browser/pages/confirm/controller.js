'use strict';

let dialog = require('remote').require('dialog');
let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.folder = installerDataSvc.installDir();
    this.folderExists = false;
    this.installables = {};
    $scope.checkboxModel = {};

    $scope.detectionStyle = false;
    
    for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
      $scope.checkboxModel[key] = value;
    }

    $scope.isConfigurationValid = this.isConfigurationValid;

    $scope.$watch(()=>{
      return $scope.checkboxModel.jdk.isConfigured()
    },(nVal,oVal)=>{
      if(nVal===false) {
        $scope.checkboxModel.jbds.selected = false;
      }
    });
    
    $scope.$watch('$viewContentLoaded', ()=>{
      console.log('content loaded');
      $scope.checkboxModel.virtualbox.detectExistingInstall(()=> {
        $scope.checkboxModel.vagrant.detectExistingInstall(()=> {
          $scope.checkboxModel.jdk.detectExistingInstall(()=> {
            $timeout(()=>{
              $scope.detectionStyle = false;
              $scope.$apply();
            });
          });
        });
      });
    });
  }

  install() {
    this.checkFolder();
    if (!this.folderExists) {
      fs.mkdirSync(this.folder);
    }

    this.installerDataSvc.setup(
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
    } else {
      this.timeout(()=>{
        this.sc.$apply(()=>{
          item.detectExistingInstall();
        })
      });
    }
  }

  checkItem(key) {
    let item = this.installerDataSvc.allInstallables().get(key);
    item.checkForExistingInstall();
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

  isConfigurationValid() {
    return this.checkboxModel.virtualbox.isConfigured()
        && this.checkboxModel.cygwin.isConfigured()
        && this.checkboxModel.vagrant.isConfigured()
        && this.checkboxModel.cdk.isConfigured();
  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc'];

export default ConfirmController;
