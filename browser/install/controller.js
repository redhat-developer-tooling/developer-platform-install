class InstallController {
  constructor($state) {
    this.router = $state;
  }

  finish() {
    this.router.go('start');
  }
}

InstallController.$inject = ['$state'];

export default InstallController;
