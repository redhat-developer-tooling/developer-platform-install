let ipc = require('ipc');

class InstallController {
  constructor($state) {
    this.router = $state;

    ipc.on('install-complete', () => {
      this.finish();
    });

    this.performInstall();
  }

  performInstall() {
    ipc.send('install');
    // ipc.send('installIDE');
    // ipc.send('installVBox');
  }

  finish() {
    this.router.go('start');
  }
}

InstallController.$inject = ['$state'];

export default InstallController;
