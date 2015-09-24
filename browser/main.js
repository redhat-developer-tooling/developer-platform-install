import angular from 'angular';
import uiRouter from 'angular-ui-router';

let mainModule = angular.module('devPlatInstaller', ['ui.router'])
                        .config( ["$stateProvider", "$urlRouterProvider", ($stateProvider, $urlRouterProvider) => {
                          $urlRouterProvider.otherwise('/account');

                          $stateProvider
                            .state('account', {
                              url: '/account',
                              controller: 'Home',
                              templateUrl: 'account/account.html'
                            });
                        }]);

export default mainModule;
