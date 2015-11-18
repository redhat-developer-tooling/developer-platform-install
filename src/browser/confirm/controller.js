'use strict';

let ipc = require('ipc');

class ConfirmController {
  constructor($state) {
    this.router = $state;
  }

  install() {
    //TODO This needs to handle changes to install location, etc

    this.router.go('install');
  }
}

ConfirmController.$inject = ['$state'];

export default ConfirmController;
