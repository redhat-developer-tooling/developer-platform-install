'use strict';

class WelcomeController {

  constructor($state, $scope, electron) {
    this.router = $state;
    this.scope = $scope;
    this.scope.background = true;
    this.electron = electron;
    $scope.version = electron.remote.app.getVersion();
  }

  next() {
    this.router.go('location');
  }

  openDevSuiteOverview() {
    this.electron.shell.openExternal('https://developers.redhat.com');
  }

}

WelcomeController.$inject = ['$state', '$scope', 'electron'];

export default WelcomeController;
