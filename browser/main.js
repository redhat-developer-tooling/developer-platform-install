import angular from 'angular';
import uiRouter from 'angular-ui-router';

import acctCtrl from './account/controller';
import confCtrl from './confirm/controller';
import instCtrl from './install/controller';
import startCtrl from './start/controller';

let mainModule = angular.module('devPlatInstaller', ['ui.router'])
                        .controller(acctCtrl.name, acctCtrl)
                        .controller(confCtrl.name, confCtrl)
                        .controller(instCtrl.name, instCtrl)
                        .controller(startCtrl.name, startCtrl)
                        .config( ["$stateProvider", "$urlRouterProvider", ($stateProvider, $urlRouterProvider) => {
                          $urlRouterProvider.otherwise('/account');

                          $stateProvider
                            .state('account', {
                              url: '/account',
                              controller: 'AccountController as acctCtrl',
                              templateUrl: 'account/account.html'
                            })
                            .state('confirm', {
                              url: '/confirm',
                              controller: 'ConfirmController as confCtrl',
                              templateUrl: 'confirm/confirm.html'
                            })
                            .state('install', {
                              url: '/install',
                              controller: 'InstallController as instCtrl',
                              templateUrl: 'install/install.html'
                            })
                            .state('start', {
                              url: '/start',
                              controller: 'StartController as startCtrl',
                              templateUrl: 'start/start.html'
                            });
                        }]);

export default mainModule;
