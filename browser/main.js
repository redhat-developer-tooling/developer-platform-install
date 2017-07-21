'use strict';

import angular from 'angular';
import '@uirouter/angularjs';
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
import componentPanel from './directives/componentPanel';
import InstallerDataService from './services/data';
import Request from './services/request';
import ComponentLoader from './services/componentLoader';
import Electron from 'electron';
import request from 'request';

let mainModule =
  angular.module('devPlatInstaller', ['ui.router', 'base64', 'ngMessages'])
    .controller(acctCtrl.name, acctCtrl)
    .controller(locCtrl.name, locCtrl)
    .controller(confCtrl.name, confCtrl)
    .controller(instCtrl.name, instCtrl)
    .controller(startCtrl.name, startCtrl)
    .value('requestMod', request)
    .factory('installerDataSvc', InstallerDataService.factory)
    .factory('request', Request.factory)
    .value('electron', Electron)
    .directive(progressBar.name, progressBar)
    .directive(componentPanel.name, componentPanel)
    .directive(breadcrumb.name, breadcrumb)
    .directive(pathValidator.name, pathValidator)
    .config( ['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) => {
      $urlRouterProvider.otherwise('/confirm');
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
    .run( ['installerDataSvc', (installerDataSvc) => {
      let loader = new ComponentLoader(installerDataSvc);
      loader.loadComponents();
    }]);

export default mainModule;
