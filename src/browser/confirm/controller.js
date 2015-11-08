class ConfirmController {
  constructor($state) {
    this.router = $state;
  }

  install() {
    this.router.go('install');
  }
}

ConfirmController.$inject = ['$state'];

export default ConfirmController;
