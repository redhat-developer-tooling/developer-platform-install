'use strict';

import angular from 'angular';
import 'angular-ui-router';
import 'angular-base64';
import 'angular-messages';
import acctCtrl from './pages/account/controller';
import locCtrl from './pages/location/controller';
import confCtrl from './pages/confirm/controller';
import instCtrl from './pages/install/controller';
import startCtrl from './pages/start/controller';
import pathValidator from './directives/pathValidator';
import progressBar from './directives/progressBar';
import breadcrumb from './directives/breadcrumb';
import InstallerDataService from './services/data';
import Request from './services/request';
import VirtualBoxInstall from './model/virtualbox';
import JdkInstall from './model/jdk-install';
import DevstudioInstall from './model/devstudio';
import CygwinInstall from './model/cygwin';
import CDKInstall from './model/cdk';
import Electron from 'electron';

let mainModule =
      angular.module('devPlatInstaller', ['ui.router', 'base64', 'ngMessages'])
          .controller(acctCtrl.name, acctCtrl)
          .controller(locCtrl.name, locCtrl)
          .controller(confCtrl.name, confCtrl)
          .controller(instCtrl.name, instCtrl)
          .controller(startCtrl.name, startCtrl)
          .factory('installerDataSvc', InstallerDataService.factory)
          .factory('request', Request.factory)
          .value('electron', Electron)
          .directive(progressBar.name, progressBar)
          .directive(breadcrumb.name, breadcrumb)
          .directive(pathValidator.name, pathValidator)
          .config( ['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) => {
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
          .run( ['$timeout', 'installerDataSvc', ($timeout, installerDataSvc) => {
            let reqs = installerDataSvc.requirements;

            // filter download-manager urls and replace host name with stage
            // host name provided in environment variable
            let stageHost = process.env['DM_STAGE_HOST'];
            if(stageHost) {
              for (let variable in reqs) {
                let dmUrl = reqs[variable]['dmUrl'];
                if (dmUrl && dmUrl.includes('download-manager/jdf/file')) {
                  reqs[variable].dmUrl = dmUrl.replace('developers.redhat.com', stageHost);
                }
              }
            }

            let virtualbox = new VirtualBoxInstall(
              reqs['virtualbox'].version,
              reqs['virtualbox'].revision,
              installerDataSvc,
              reqs['virtualbox'].url,
              reqs['virtualbox'].filename,
              'virtualbox',
              reqs['virtualbox'].sha256sum);

            let cygwin = new CygwinInstall(
              installerDataSvc,
              reqs['cygwin'].url,
              reqs['cygwin'].filename,
              'cygwin',
              reqs['cygwin'].sha256sum);

            let cdk = new CDKInstall(
              installerDataSvc,
              $timeout,
              reqs['cdk'].dmUrl,
              reqs['cdk'].filename,
              'cdk',
              reqs['cdk'].sha256sum
            );

            let jdk = new JdkInstall(
              installerDataSvc,
              reqs['jdk'].dmUrl,
              reqs['jdk'].filename,
              reqs['jdk'].prefix,
              'jdk8',
              reqs['jdk'].sha256sum);

            let devstudio = new DevstudioInstall(
              installerDataSvc,
              reqs['devstudio'].dmUrl,
              reqs['devstudio'].filename,
              'developer-studio',
              reqs['devstudio'].sha256sum);

            installerDataSvc.addItemsToInstall(virtualbox, cygwin, cdk, jdk, devstudio);

            jdk.thenInstall(devstudio);
            jdk.thenInstall(virtualbox).thenInstall(cygwin).thenInstall(cdk);

          }]);

export default mainModule;
