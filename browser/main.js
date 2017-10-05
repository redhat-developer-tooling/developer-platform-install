'use strict';

import angular from 'angular';
import '@uirouter/angularjs';
import 'angular-base64';
import 'angular-messages';
import 'ng-focus-if';
import welcomeCtrl from './pages/welcome/controller';
import acctCtrl from './pages/account/controller';
import locCtrl from './pages/location/controller';
import confCtrl from './pages/confirm/controller';
import instCtrl from './pages/install/controller';
import startCtrl from './pages/start/controller';
import selectCtrl from './pages/selection/controller';
import pathValidator from './directives/pathValidator';
import progressBar from './directives/progressBar';
import breadcrumb from './directives/breadcrumb';
import componentPanel from './directives/componentPanel';
import InstallerDataService from './services/data';
import Request from './services/request';
import Electron from 'electron';
import request from 'request';
import humanize from 'humanize';

let mainModule =
  angular.module('devPlatInstaller', ['ui.router', 'base64', 'ngMessages', 'focus-if'])
    .controller(welcomeCtrl.name, welcomeCtrl)
    .controller(acctCtrl.name, acctCtrl)
    .controller(locCtrl.name, locCtrl)
    .controller(confCtrl.name, confCtrl)
    .controller(instCtrl.name, instCtrl)
    .controller(startCtrl.name, startCtrl)
    .controller(selectCtrl.name, selectCtrl)
    .value('requestMod', request)
    .factory('installerDataSvc', InstallerDataService.factory)
    .factory('request', Request.factory)
    .value('electron', Electron)
    .directive(progressBar.name, progressBar)
    .directive(componentPanel.name, componentPanel)
    .directive(breadcrumb.name, breadcrumb)
    .directive(pathValidator.name, pathValidator)
    .config( ['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) => {
      $urlRouterProvider.otherwise('/welcome');
      $stateProvider
        .state('welcome', {
          url: '/welcome',
          controller: 'WelcomeController as welcomeCtrl',
          templateUrl: 'pages/welcome/welcome.html'
        })
        .state('location', {
          url: '/location',
          controller: 'LocationController as locCtrl',
          templateUrl: 'pages/location/location.html',
          data: {
            displayName: 'Target Folder'
          }
        })
        .state('selection', {
          url: '/selection',
          controller: 'SelectionController as selectCtrl',
          templateUrl: 'pages/selection/selection.html',
          data: {
            displayName: 'Selection'
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
        .state('account', {
          url: '/account',
          controller: 'AccountController as acctCtrl',
          templateUrl: 'pages/account/account.html',
          data: {
            displayName: 'Account'
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
    .filter('humanize', function() {
      return function(text) {
        if(text) {
          return humanize.filesize(text);
        }
      };
    });

export default mainModule;
