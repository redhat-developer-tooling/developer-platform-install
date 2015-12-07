'use strict';

import angular from 'angular';
import uiRouter from 'angular-ui-router';
import base64 from 'angular-base64';

import acctCtrl from './pages/account/controller';
import confCtrl from './pages/confirm/controller';
import instCtrl from './pages/install/controller';
import startCtrl from './pages/start/controller';
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
                'cdk',
                new CDKInstall(installerDataSvc,
                                $timeout,
                                'https://developers.redhat.com/download-manager/jdf/file/cdk-2.0.0-beta3.zip?workflow=direct',
                                'https://developers.redhat.com/download-manager/jdf/file/rhel-cdk-kubernetes-7.2-6.x86_64.vagrant-virtualbox.box?workflow=direct',
                                'https://github.com/openshift/origin/releases/download/v1.1.0.1/openshift-origin-v1.1.0.1-bf56e23-windows-amd64.zip',
                                'https://github.com/redhat-developer-tooling/openshift-vagrant/archive/master.zip',
                                'http://the.earth.li/~sgtatham/putty/latest/x86/pscp.exe',
                                null)
            );

            installerDataSvc.addItemToInstall(
                'vagrant',
                new VagrantInstall(installerDataSvc,
                                    'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip',
                                    null)
            );

            installerDataSvc.addItemToInstall(
                'virtualbox',
                new VirtualBoxInstall('5.0.8',
                                      '103449',
                                      installerDataSvc,
                                      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe',
                                      null)
            );

            installerDataSvc.addItemToInstall(
                'jdk',
                new JdkInstall(installerDataSvc,
                               'http://cdn.azulsystems.com/zulu/bin/zulu1.8.0_66-8.11.0.1-win64.zip',
                               null)
            );

            installerDataSvc.addItemToInstall(
                'jbds',
                new JbdsInstall(installerDataSvc,
                                'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/jboss-devstudio-9.1.0.latest-installer-standalone.jar',
                                null)
            );

            installerDataSvc.addItemToInstall(
                'cygwin',
                new CygwinInstall(installerDataSvc,
                                  'https://cygwin.com/setup-x86_64.exe',
                                  null)
            );
          }]);

export default mainModule;
