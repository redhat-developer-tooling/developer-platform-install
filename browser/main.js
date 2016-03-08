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
                                  'http://dgolovin.github.io/mingw-ssh-rsync/ssh-rsync.zip',
                                  null)
            );
            installerDataSvc.addItemToInstall(
                VagrantInstall.key(),
                new VagrantInstall(installerDataSvc,
                                    'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip',
                                    null)
            );
            installerDataSvc.addItemToInstall(
                CDKInstall.key(),
                new CDKInstall(installerDataSvc,
                                $timeout,
                                'http://cdk-builds.usersys.redhat.com/builds/03-Mar-2016/cdk.zip',
                                'http://cdk-builds.usersys.redhat.com/builds/03-Mar-2016/rhel-7.2-server-kubernetes-vagrant-scratch-7.2-1.x86_64.vagrant-virtualbox.box',
                                'https://ci.openshift.redhat.com/jenkins/job/devenv_ami/lastSuccessfulBuild/artifact/origin/artifacts/release/',
                                'https://github.com/redhat-developer-tooling/openshift-vagrant/archive/master.zip',
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
