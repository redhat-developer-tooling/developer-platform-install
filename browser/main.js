'use strict';

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
                new VirtualBoxInstall('5.0.8',
                                        '103449',
                                        installerDataSvc,
                                        'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe',
                                        null)
            );
            installerDataSvc.addItemToInstall(
                CygwinInstall.key(),
                new CygwinInstall(installerDataSvc,
                                  'https://cygwin.com/setup-x86_64.exe',
                                  null)
            );
            installerDataSvc.addItemToInstall(
                VagrantInstall.key(),
                new VagrantInstall(installerDataSvc,
                                    'https://releases.hashicorp.com/vagrant/1.7.4/vagrant_1.7.4.msi',
                                    null)
            );
            installerDataSvc.addItemToInstall(
                CDKInstall.key(),
                new CDKInstall(installerDataSvc,
                                $timeout,
                                'http://cdk-builds.usersys.redhat.com/builds/09-Mar-2016/cdk-2.0.0-beta5.zip',
                                'http://cdk-builds.usersys.redhat.com/builds/09-Mar-2016/rhel-cdk-kubernetes-7.2-21.x86_64.vagrant-virtualbox.box',
                                'https://ci.openshift.redhat.com/jenkins/job/devenv_ami/lastSuccessfulBuild/artifact/origin/artifacts/release/',
                                'http://the.earth.li/~sgtatham/putty/latest/x86/pscp.exe',
                                null)
            );

            installerDataSvc.addItemToInstall(
                JdkInstall.key(),
                new JdkInstall(installerDataSvc,
                               'http://cdn.azul.com/zulu/bin/zulu8.13.0.5-jdk8.0.72-win_x64.zip',
                               null)
            );

            installerDataSvc.addItemToInstall(
                JbdsInstall.key(),
                new JbdsInstall(installerDataSvc,
                                'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/jboss-devstudio-9.1.0.latest-installer-standalone.jar',
                                null)
            );
          }]);

export default mainModule;
