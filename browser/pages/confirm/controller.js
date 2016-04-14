'use strict';

let dialog = require('remote').require('dialog');
let remote = require('remote');
let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import Logger from '../../services/logger';

/*import {remote, ipcRenderer} from 'electron-prebuilt';*/

// sadly we had to hoist this outside the controller so that it could be seen and used. Maybe a better way can be found.
let confCtrl = null;

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc) {
    confCtrl = this;
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;

    confCtrl.installedSearchNote = ' The system is checking if you have any installed components.';
    confCtrl.isDisabled = true;
    confCtrl.numberOfExistingInstallations = 0;

    confCtrl.showCloseDialog = false;
    
    this.installables = {};
    $scope.checkboxModel = {};

    $scope.detectionStyle = false;

    for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
      $scope.checkboxModel[key] = value;
      $scope.$watch(()=>{
        return $scope.checkboxModel[key].selectedOption;
      },(newVal,oldVal)=>{
        $scope.checkboxModel[key].validateVersion();
      });
    }

    $scope.isConfigurationValid = this.isConfigurationValid;

    // IF the JDK is not Configured then you can't install JBDS
    $scope.$watch(()=>{
      return $scope.checkboxModel.jdk.isConfigured()
    },(nVal,oVal)=>{
      if(nVal===false) {
        $scope.checkboxModel.jbds.selected = false;
      }
    });

    $scope.$watch('$viewContentLoaded', ()=>{
      $scope.checkboxModel.virtualbox.detectExistingInstall(()=> {
        $scope.checkboxModel.vagrant.detectExistingInstall(()=> {
          $scope.checkboxModel.jdk.detectExistingInstall(()=> {
            // Once all the Existing installations have been searched, enable the screen.
            confCtrl.setIsDisabled();
          });
        });
      });
    });
  }

  // Prep the install location path for each product, then go to the next page.
  install() {
    this.installerDataSvc.setup(
      this.installerDataSvc.getInstallable('virtualbox').getLocation(),
      this.installerDataSvc.getInstallable('jdk').getLocation(),
      this.installerDataSvc.getInstallable('jbds').getLocation(),
      this.installerDataSvc.getInstallable('vagrant').getLocation(),
      this.installerDataSvc.getInstallable('cygwin').getLocation(),
      this.installerDataSvc.getInstallable('cdk').getLocation()
    );
    this.router.go('install');
  }

  setIsDisabled() {
    // Uncomment the timeout to see the initial disabled view.
//    this.timeout( () => {
      // Switch this boolean flag when the app is done looking for existing installations.
      confCtrl.isDisabled = !confCtrl.isDisabled;
      
      // Count the number of existing installations.
      for (var [key, value] of confCtrl.installerDataSvc.allInstallables().entries()) {
        if (confCtrl.sc.checkboxModel[key].hasOption('detected')) {
          ++confCtrl.numberOfExistingInstallations;
        }
      }
  
      // Set the message depending on if the view is disabled or not.
      if (confCtrl.isDisabled) {
        confCtrl.installedSearchNote = '  The system is checking if you have any installed components.';
      } else {
        confCtrl.installedSearchNote = `  We found ${confCtrl.numberOfExistingInstallations} installed component that meets the requirement.`;
      }
      
      // Call the digest cycle so that the view gets updated.
      confCtrl.sc.$apply();
//    }, 5000);
  }
  
  // Open up a browse dialog and select the dir that has the installed product you are looking for.
  selectItem(key) {
    let selection = dialog.showOpenDialog({
      properties: [ 'openDirectory' ],
      defaultPath: this.installables[key] && this.installables[key][0].existingInstallLocation ? this.installables[key][0].existingInstallLocation : this.installerDataSvc.installRoot
    });

    let item = this.installerDataSvc.allInstallables().get(key);

    // If the browsed for dir is found then expect it to be JBDS
    if (selection) {
      // only JBDS at the moment
      item.checkForExistingInstall(selection, this.installables);
    } else {
      this.timeout(()=>{
        this.sc.$apply(()=>{
          item.detectExistingInstall();
        })
      });
    }
  }

  // Check if the product is already installed
  // ATM this is only JBDS
  checkItem(key) {
    let item = this.installerDataSvc.allInstallables().get(key);
    item.checkForExistingInstall();
  }

  isConfigurationValid() {
    return this.checkboxModel.virtualbox.isConfigured()
        && this.checkboxModel.cygwin.isConfigured()
        && this.checkboxModel.vagrant.isConfigured()
        && this.checkboxModel.cdk.isConfigured();
  }

  exit() {
    Logger.info('Closing the installer window');
    remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.router.go('location');
  }
  
  setCloseDialog () {
    confCtrl.showCloseDialog = !confCtrl.showCloseDialog;
  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc'];

export default ConfirmController;
