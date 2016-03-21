'use strict';

let ijson = require('../installers.json');

import angular from 'angular';
import uiRouter from 'angular-ui-router';
import base64 from 'angular-base64';

import acctCtrl from './pages/account/controller';
import confCtrl from './pages/confirm/controller';
import instCtrl from './pages/install/controller';
import startCtrl from './pages/start/controller';
import pathValidator from './directives/pathValidator';
import progressBar from './directives/progressBar';
import breadcrumb from './directives/breadcrumb';
import InstallerDataService from './services/data';
import VirtualBoxInstall from './model/virtualbox';
import JdkInstall from './model/jdk-install';
import JbdsInstall from './model/jbds';
import VagrantInstall from './model/vagrant';
import CygwinInstall from './model/cygwin';
import CDKInstall from './model/cdk';

let mainModule =
      angular.module('devPlatInstaller', ['ui.router', 'base64'])
          .controller(acctCtrl.name, acctCtrl)
          .controller(confCtrl.name, confCtrl)
          .controller(instCtrl.name, instCtrl)
          .controller(startCtrl.name, startCtrl)
          .factory('installerDataSvc', InstallerDataService.factory)
          .directive(progressBar.name, progressBar)
          .directive(breadcrumb.name, ['$state', breadcrumb])
          .directive(pathValidator.name, pathValidator)
          .config( ["$stateProvider", "$urlRouterProvider", ($stateProvider, $urlRouterProvider) => {
            $urlRouterProvider.otherwise('/account');

            $stateProvider
              .state('account', {
                url: '/account',
                controller: 'AccountController as acctCtrl',
                templateUrl: 'pages/account/account.html',
                data: {
                  displayName: 'Install Setup'
                }
              })
              .state('confirm', {
                url: '/confirm',
                controller: 'ConfirmController as confCtrl',
                templateUrl: 'pages/confirm/confirm.html',
                data: {
                  displayName: 'Confirmation'
                }
              })
              .state('install', {
                url: '/install',
                controller: 'InstallController as instCtrl',
                templateUrl: 'pages/install/install.html',
                data: {
                  displayName: 'Download & Install'
                }
              })
              .state('start', {
                url: '/start',
                controller: 'StartController as startCtrl',
                templateUrl: 'pages/start/start.html',
                data: {
                  displayName: 'Get Started'
                }
              });
          }])
          .run( ['$rootScope', '$location', '$timeout', 'installerDataSvc', ($rootScope, $location, $timeout, installerDataSvc) => {
            installerDataSvc.addItemToInstall(
                VirtualBoxInstall.key(),
                new VirtualBoxInstall(ijson.installerURLs['virtualbox']['version'],
                                        ijson.installerURLs['virtualbox']['revision'],
                                        installerDataSvc,
                                        ijson.installerURLs['virtualbox']['url'],
                                        null)
            );
            installerDataSvc.addItemToInstall(
                CygwinInstall.key(),
                new CygwinInstall(installerDataSvc,
                                  ijson.installerURLs['cygwin'],
                                  null)
            );
            installerDataSvc.addItemToInstall(
                VagrantInstall.key(),
                new VagrantInstall(installerDataSvc,
                                    ijson.installerURLs['vagrant'],
                                    null)
            );
            installerDataSvc.addItemToInstall(
                CDKInstall.key(),
                new CDKInstall(installerDataSvc,
                                $timeout,
                                ijson.installerURLs['cdk']['cdkZip'],
                                ijson.installerURLs['cdk']['vagrantVirtualBox'],
                                ijson.installerURLs['cdk']['openshift-origin-client-tools-windows.zip'],
                                ijson.installerURLs['cdk']['openshift-vagrant-sources.zip'],
                                ijson.installerURLs['cdk']['pscp.exe'],
                                null)
            );

            installerDataSvc.addItemToInstall(
                JdkInstall.key(),
                new JdkInstall(installerDataSvc,
                               ijson.installerURLs['jdk'],
                               null)
            );

            installerDataSvc.addItemToInstall(
                JbdsInstall.key(),
                new JbdsInstall(installerDataSvc,
                                ijson.installerURLs['jbds'],
                                null)
            );
          }]);

export default mainModule;
