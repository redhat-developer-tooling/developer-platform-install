'use strict';

function getStarted() {
  return {
    controller: ('getStartedController', ['$scope', 'electron', 'installerDataSvc', function($scope, electron, installerDataSvc) {
      $scope.checkStatus = function(component) {

        return installerDataSvc.getInstallable(component).isSkipped();
      };

      $scope.fetchDesc = function(component) {
        return installerDataSvc.getInstallable(component).productDesc;
      };

      $scope.fetchName = function(component) {
        return installerDataSvc.getInstallable(component).productName;
      };

      $scope.gotoDocs = function(component) {
        electron.shell.openExternal('https://developers.redhat.com/products/'+ component +'/docs-and-apis/');
      };

      $scope.gotoLearn = function(component) {
        if(component==='devstudio'){
          electron.shell.openExternal('https://developers.redhat.com/products/devstudio/learn/');
        } else if(component==='cdk') {
          electron.shell.openExternal('https://developers.redhat.com/topics/containers/');
        }
      };
    }]),
    restrict: 'E',
    replace: true,
    scope: {
      component: '=',
      start: '&'
    },
    templateUrl: 'directives/getStarted.html'
  };
}

export default getStarted;
