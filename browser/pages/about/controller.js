'use strict';

const semver = require('semver');
import Platform from '../../services/platform';

class AboutController {

  constructor($state, $scope, electron) {
    this.router = $state;
    this.scope = $scope;
    this.scope.background = true;
    this.electron = electron;
    $scope.version = electron.remote.app.getVersion();
  }

  get shortVersion() {
    return `${semver.major(this.scope.version)}.${semver.minor(this.scope.version)}`;
  }

  documentation() {
    this.electron.shell.openExternal(`https://access.redhat.com/documentation/en/red-hat-development-suite?version=${this.shortVersion}`);
  }

  release() {
    this.electron.shell.openExternal(`https://access.redhat.com/documentation/en-us/red_hat_development_suite/${this.shortVersion}/html/release_notes_and_known_issues/`);
  }

  report() {
    this.electron.shell.openExternal('https://github.com/redhat-developer-tooling/developer-platform-install/blob/master/CONTRIBUTING.md#reporting-an-issue');
  }

  isDarwinPlatform() {
    return Platform.OS == 'darwin';
  }

}

AboutController.$inject = ['$state', '$scope', 'electron'];

export default AboutController;
