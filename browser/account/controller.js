class AccountController {
  constructor($state) {
    this.router = $state;
  }

  login() {
    this.router.go('confirm');
  }
}

AccountController.$inject = ['$state'];

export default AccountController;
