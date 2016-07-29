'use strict';

import angular from 'angular';
import uiRouter from 'angular-ui-router';
import base64 from 'angular-base64';
import messages from 'angular-messages';
import acctCtrl from './pages/account/controller';
import locCtrl from './pages/location/controller';
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
import Util from './model/helpers/util';

let mainModule =
      angular.module('devPlatInstaller', ['ui.router', 'base64', 'ngMessages'])
          .controller(acctCtrl.name, acctCtrl)
          .controller(locCtrl.name, locCtrl)
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
                templateUrl: 'pages/account/account.html'
              })
              .state('location', {
                url: '/location',
                controller: 'LocationController as locCtrl',
                templateUrl: 'pages/location/location.html',
                data: {
                  displayName: 'Target Folder'
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
            let reqs = Util.resolveFile('.', 'requirements.json');

            installerDataSvc.addItemToInstall(
                VirtualBoxInstall.key(),
                new VirtualBoxInstall(
                    reqs['virtualbox.exe'].version,
                    reqs['virtualbox.exe'].revision,
                    installerDataSvc,
                    reqs['virtualbox.exe'].url,
                    null,
                    'virtualbox',
                    reqs['virtualbox.exe'].sha256sum)
            );

            installerDataSvc.addItemToInstall(
                CygwinInstall.key(),
                new CygwinInstall(
                    installerDataSvc,
                    reqs['cygwin.exe'].url,
                    null,
                    'cygwin')
            );

            installerDataSvc.addItemToInstall(
                VagrantInstall.key(),
                new VagrantInstall(
                    installerDataSvc,
                    reqs['vagrant.msi'].url,
                    null,
                    'vagrant',
                    reqs['vagrant.msi'].sha256sum)
            );

            installerDataSvc.addItemToInstall(
                CDKInstall.key(),
                new CDKInstall(
                    installerDataSvc,
                    $timeout,
                    reqs['cdk.zip'].url,
                    reqs['rhel-vagrant-virtualbox.box'].url,
                    reqs['oc.zip'].url,
                    null,
                    'cdk')
            );

            installerDataSvc.addItemToInstall(
                JdkInstall.key(),
                new JdkInstall(
                    installerDataSvc,
                    reqs['jdk.zip'].url,
                    null,
                    reqs['jdk.zip'].prefix,
                    'jdk8')
            );

            installerDataSvc.addItemToInstall(
                JbdsInstall.key(),
                new JbdsInstall(
                    installerDataSvc,
                    reqs['jbds.jar'].url,
                    null,
                    'developer-studio')
            );
          }]);

export default mainModule;
