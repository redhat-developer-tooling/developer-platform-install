'use strict';

import angular from 'angular';
import '@uirouter/angularjs';
import 'angular-base64';
import 'angular-messages';
import 'ng-focus-if';
import aboutCtrl from './pages/about/controller';
import Electron from 'electron';

angular.element(document).ready(function() {
  angular.bootstrap(document, [aboutModule.name], { strictDi: true });
});


let aboutModule =
  angular.module('devPlatInstaller', ['ui.router', 'base64', 'ngMessages', 'focus-if'])
    .controller(aboutCtrl.name, aboutCtrl)
    .value('electron', Electron)
    .config( ['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) => {
      $urlRouterProvider.otherwise('/about');
      $stateProvider
        .state('about', {
          url: '/about',
          controller: 'AboutController as aboutCtrl',
          templateUrl: 'pages/about/about.html'
        });
    }]);
