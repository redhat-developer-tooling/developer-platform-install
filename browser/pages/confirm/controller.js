'use strict';

let remote = require('electron').remote;
let dialog = remote.dialog;
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
    $scope.platform = process.platform;
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

    // IF the JDK is not Configured then you can't install devstudio
    $scope.$watch(()=>{
      return $scope.checkboxModel.cdk.selectedOption;
    },(nVal,oVal)=>{
      if(nVal=='install') {

        if($scope.checkboxModel.vagrant.selectedOption == 'detected'
          && !$scope.checkboxModel.vagrant.hasOption('detected')) {
          $scope.checkboxModel.vagrant.selectedOption = 'install';
        }
        if($scope.checkboxModel.virtualbox.selectedOption == 'detected'
          && !$scope.checkboxModel.virtualbox.hasOption('detected')) {
          $scope.checkboxModel.virtualbox.selectedOption = 'install';
        }
        if($scope.checkboxModel.cygwin.selectedOption == 'detected'
          && !$scope.checkboxModel.cygwin.hasOption('detected')) {
          // force to install included version
          $scope.checkboxModel.cygwin.selectedOption = 'install';
        }
      }
    });

    $scope.$watch(()=>{
      return $scope.checkboxModel.jbds.selectedOption;
    },(nVal,oVal)=>{
      if(nVal=='install') {
        let jdk = $scope.checkboxModel.jdk;
        // if jdk is not selected for install and there is no detected version
        if(jdk.selectedOption == 'detected' && !jdk.hasOption('detected')
          // or java detected but not valid
          || jdk.hasOption('detected') && !jdk.option.detected.valid) {
          // force to install included version
          jdk.selectedOption = 'install';
        }
      }
    });

    $scope.$watch('$viewContentLoaded', ()=>{
      $scope.checkboxModel.virtualbox.detectExistingInstall(()=> {
        $scope.checkboxModel.vagrant.detectExistingInstall(()=> {
          $scope.checkboxModel.jdk.detectExistingInstall(()=> {
            $scope.checkboxModel.cygwin.detectExistingInstall(()=> {
             confCtrl.setIsDisabled();
            });
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
    this.timeout( () => {
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
        confCtrl.installedSearchNote = '  The system is checking if you have any installed components';
      } else {
        if (confCtrl.numberOfExistingInstallations == 1) {
          confCtrl.installedSearchNote = `  We found ${confCtrl.numberOfExistingInstallations} installed component`;
        } else if (confCtrl.numberOfExistingInstallations > 1) {
          confCtrl.installedSearchNote = `  We found ${confCtrl.numberOfExistingInstallations} installed components`;
        } else {
          confCtrl.installedSearchNote = '';
        }
      }

      // Call the digest cycle so that the view gets updated.
      confCtrl.sc.$apply();
    }, 2000);
  }

  // Open up a browse dialog and select the dir that has the installed product you are looking for.
  selectItem(key) {
    let selection = dialog.showOpenDialog({
      properties: [ 'openDirectory' ],
      defaultPath: this.installables[key] && this.installables[key][0].existingInstallLocation ? this.installables[key][0].existingInstallLocation : this.installerDataSvc.installRoot
    });

    let item = this.installerDataSvc.allInstallables().get(key);

    // If the browsed for dir is found then expect it to be devstudio
    if (selection) {
      // only devstudio at the moment
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
  // ATM this is only devstudio
  checkItem(key) {
    let item = this.installerDataSvc.allInstallables().get(key);
    item.checkForExistingInstall();
  }

  jbdsIsConfigured() {
    return this.sc.checkboxModel.jdk.isConfigured()
      && this.sc.checkboxModel.jbds.isConfigured()
      || this.sc.checkboxModel.jbds.isSkipped();
  }

  cdkIsConfigured() {
    return this.sc.checkboxModel.cdk.isConfigured()
      && this.sc.checkboxModel.virtualbox.isConfigured()
      && this.sc.checkboxModel.cygwin.isConfigured()
      && this.sc.checkboxModel.vagrant.isConfigured()
      || this.sc.checkboxModel.cdk.isSkipped();
  }

  isConfigurationValid() {
    return this.jbdsIsConfigured()
      && this.cdkIsConfigured()
      && this.isAtLeastOneSelected();
  }

  isAtLeastOneSelected() {
    for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(!value.isSkipped()) {
        return true;
      }
    }
    return false;
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
