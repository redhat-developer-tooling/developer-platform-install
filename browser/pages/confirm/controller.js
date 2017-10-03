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
    $scope.downloadComp = this.detectDownloadedComponents();

    $scope.updateTotalDownloadSize = () => {
      let totalDownloadSize = 0;
      for (let value of this.installerDataSvc.allInstallables().values()) {
        if(value.size && value.selectedOption == 'install') {
            totalDownloadSize += value.size;
          }
      }
      return totalDownloadSize;
    };
<<<<<<< HEAD

    $scope.updateTotalInstallSize = () => {
      let totalInstallSize = 0;
      for (let value of this.installerDataSvc.allInstallables().values()) {
        if(value.installSize && value.selectedOption == 'install') {
            totalInstallSize += value.installSize;
          }
        }
      return totalInstallSize;
    };
=======
  }

  selectAll() {
    let checkboxModel = this.sc.checkboxModel;
    for (let key in checkboxModel) {
      let node = checkboxModel[key];
      if (node.isInstallable && node.isNotDetected()) {
        node.selectedOption = 'install';
      }
    }
  }

  deselectAll() {
    let checkboxModel = this.sc.checkboxModel;
    for (let key in checkboxModel) {
      checkboxModel[key].selectedOption = 'detected';
    }
  }

  initPage() {
    return this.detectInstalledComponents().then(()=> {
      this.graph = ComponentLoader.loadGraph(this.installerDataSvc);
      this.installWatchers();
      return Promise.resolve();
    }).then(
      ()=> this.setIsDisabled()
    ).catch(()=> {
      this.setIsDisabled();
    });
  }

  activatePage() {
    return this.detectInstalledComponents().then(
      ()=> this.setIsDisabled()
    ).catch((error)=> {
      Logger.error(error);
      this.setIsDisabled();
    });
  }

  installWatchers() {
    let graph = this.graph;
    let nodes = graph.overallOrder() ;
    let checkboxModel = this.sc.checkboxModel;
    for (let node of nodes) {
      checkboxModel[node].dependenciesOf = [];
      for(let dependant of this.graph.dependantsOf(node)) {
        checkboxModel[node].dependenciesOf.push(checkboxModel[dependant]);
      }
      checkboxModel[node].references=0;
    }
    for (let node of nodes) {
      this.sc.$watch(`checkboxModel.${node}.selectedOption`, function watchComponent(newv, oldv) {
        let installer = checkboxModel[node];
        if(installer.isSelected()) {
          for(let dep of graph.dependenciesOf(node)) {
            let depInstaller = checkboxModel[dep];
            if(depInstaller.isInstallable && depInstaller.references === 0 && depInstaller.isNotDetected()) {
              depInstaller.selectedOption = 'install';
            }
            depInstaller.references++;
          }
        } else if(!installer.isSelected() && oldv === 'install') {
          for(let dep of graph.dependenciesOf(node)) {
            let depInstaller = checkboxModel[dep];
            depInstaller.references--;
            if(depInstaller.references === 0) {
              depInstaller.selectedOption = 'detected';
            }
          }
        }
      });
    }
>>>>>>> 7cf6a93f0366ade16f6d7885b7ec7c6d612d8b0b
  }

  detectDownloadedComponents() {
    let downloadedComponents = [];
    for (let value of this.installerDataSvc.allInstallables().values()) {
      if(value.selectedOption == 'install') {
        downloadedComponents.push(value);
      }
      this.downloadComp = downloadedComponents;
    }
    return this.downloadComp;
  }

  next() {
    this.router.go(this.getNextPage());
  }

  isAccountRequired() {
    let required = false;
    for (let value of this.installerDataSvc.allInstallables().values()) {
      required = value.authRequired
        && value.selectedOption == 'install';
      if(required) {
        break;
      }
    }
    return required;
  }

  getNextPage () {
    if(this.isAccountRequired()) {
      return 'account';
    } else {
      return 'install';
    }
  }

  getNextButtonName () {
    if(this.isAccountRequired()) {
      return 'Next';
    } else {
      return 'Download & Install';
    }
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    // this.electron.remote.getCurrentWindow().removeAllListeners('focus');
    this.router.go('selection');
  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default ConfirmController;
