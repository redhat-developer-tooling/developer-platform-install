'use strict';

class AboutController {

  constructor($state, $scope, electron) {
    this.router = $state;
    this.scope = $scope;
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

AboutController.$inject = ['$state', '$scope', 'electron'];

export default AboutController;
