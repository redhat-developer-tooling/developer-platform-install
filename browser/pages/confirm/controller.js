'use strict';

import Logger from '../../services/logger';
import Platform from '../../services/platform';

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc, electron) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;

    this.installedSearchNote = ' The system is checking if you have any installed components.';
    this.isDisabled = true;
    this.numberOfExistingInstallations = 0;

    this.installables = {};
    $scope.checkboxModel = {};
    $scope.platform = Platform.OS;
    $scope.detectionStyle = false;

    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      $scope.checkboxModel[key] = value;
      $scope.$watch(`checkboxModel.${key}.selectedOption`, function watchInstallSelectionChange() {
        $scope.checkboxModel[key].validateVersion();
      });
    }

    $scope.isConfigurationValid = this.isConfigurationValid;

    // IF the JDK is not Configured then you can't install devstudio
    $scope.$watch('checkboxModel.cdk.selectedOption', function watchCdkSelectionChange(nVal) {
      if(nVal=='install') {
        if($scope.checkboxModel.virtualbox.selectedOption == 'detected'
          && !$scope.checkboxModel.virtualbox.hasOption('detected')) {
          $scope.checkboxModel.virtualbox.selectedOption = 'install';
        }
        if($scope.checkboxModel.cygwin.selectedOption == 'detected'
          && !$scope.checkboxModel.cygwin.hasOption('detected')) {
          $scope.checkboxModel.cygwin.selectedOption = 'install';
        }
      } else if (nVal=='detected') {
        $scope.checkboxModel.virtualbox.selectedOption = 'detected';
        $scope.checkboxModel.cygwin.selectedOption = 'detected';
      }
    });

    $scope.$watch('checkboxModel.jbds.selectedOption', function watchDevStudioSelectionChange(nVal) {
      if(nVal=='install') {
        let jdk = $scope.checkboxModel.jdk;
        // if jdk is not selected for install and there is no detected version
        if(jdk.selectedOption == 'detected' && !jdk.hasOption('detected') && $scope.platform === 'win32'
          // or java detected but not valid
          || jdk.hasOption('detected') && !jdk.option.detected.valid && $scope.platform === 'win32' ) {
          // force to install included version
          jdk.selectedOption = 'install';
        }
      } else if (nVal=='detected') {
        $scope.checkboxModel.jdk.selectedOption = 'detected';
      }
    });

    $scope.$watch('$viewContentLoaded', ()=>{
      let detectors = [];
      for (var installer of this.installerDataSvc.allInstallables().values()) {
        detectors.push(new Promise(function(resolve) {
          installer.detectExistingInstall(()=> {
            resolve();
          });
        }));
      }
      Promise.all(detectors).then(
        ()=>this.setIsDisabled()
      ).catch(
        ()=>this.setIsDisabled()
      );
    });
  }

  download(url) {
    this.electron.shell.openExternal(url);
  }

  // Prep the install location path for each product, then go to the next page.
  install() {
    this.installerDataSvc.setup(
      this.installerDataSvc.getInstallable('virtualbox').getLocation(),
      this.installerDataSvc.getInstallable('jdk').getLocation(),
      this.installerDataSvc.getInstallable('jbds').getLocation(),
      this.installerDataSvc.getInstallable('cygwin').getLocation(),
      this.installerDataSvc.getInstallable('cdk').getLocation()
    );
    this.router.go('install');
  }

  setIsDisabled() {
    // Uncomment the timeout to see the initial disabled view.
    this.timeout( () => {
      // Switch this boolean flag when the app is done looking for existing installations.
      this.isDisabled = !this.isDisabled;

      // Count the number of existing installations.
      for (var [, value] of this.installerDataSvc.allInstallables()) {
        if (value.hasOption('detected')) {
          ++this.numberOfExistingInstallations;
        }
      }

      // temp solution to skip cygwin from counting on macOS
      Platform.identify({
        darwin: ()=>{
          this.numberOfExistingInstallations--;
        }
      });

      // Set the message depending on if the view is disabled or not.
      if (this.isDisabled) {
        this.installedSearchNote = '  The system is checking if you have any installed components';
      } else {
        if (this.numberOfExistingInstallations == 1) {
          this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed component`;
        } else if (this.numberOfExistingInstallations > 1) {
          this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed components`;
        } else {
          this.installedSearchNote = '';
        }
      }

      // Call the digest cycle so that the view gets updated.
      this.sc.$apply();
    });
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
      || this.sc.checkboxModel.cdk.isSkipped();
  }

  isConfigurationValid() {
    return this.jbdsIsConfigured()
      && this.cdkIsConfigured()
      && this.isAtLeastOneSelected();
  }

  isAtLeastOneSelected() {
    for (var [, value] of this.installerDataSvc.allInstallables()) {
      if(!value.isSkipped()) {
        return true;
      }
    }
    return false;
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.router.go('location');
  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default ConfirmController;
