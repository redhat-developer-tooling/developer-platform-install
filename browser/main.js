'use strict';

import angular from 'angular';
import uiRouter from 'angular-ui-router';

import acctCtrl from './account/controller';
import confCtrl from './confirm/controller';
import instCtrl from './install/controller';
import startCtrl from './start/controller';
import progressBar from './directives/progressBar.js';
import InstallerDataService from './services/data';
import VirtualBoxInstall from './model/virtualbox';

let env = require('remote').require('../main/env');

let mainModule =
      angular.module('devPlatInstaller', ['ui.router'])
          .controller(acctCtrl.name, acctCtrl)
          .controller(confCtrl.name, confCtrl)
          .controller(instCtrl.name, instCtrl)
          .controller(startCtrl.name, startCtrl)
          .factory('installerDataSvc', InstallerDataService.factory)
          .directive(progressBar.name, progressBar)
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
          }])
          .run( ['$rootScope', '$location', 'installerDataSvc', ($rootScope, $location, installerDataSvc) => {
            installerDataSvc.addItemToInstall(
                'virtualbox',
                new VirtualBoxInstall('5.0.8',
                                      '103449',
                                      env.installRoot(),
                                      env.tempDir(),
                                      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe',
                                      null));
          }]);

export default mainModule;
