'use strict';

function componentPanel() {
  return {
    controller: ('componentController', ['$scope', 'electron', 'installerDataSvc', function($scope, electron, installerDataSvc) {
      $scope.openUrl = function(url) {
        electron.shell.openExternal(url);
      };

      $scope.evaluateCondition = function(content) {
        let evaluate = new Function('installerDataSvc', 'return ' + content);
        return evaluate(installerDataSvc);
      };

      $scope.parseNumber = function(string) {
        return parseFloat(string);
      };
    }]),
    restrict: 'E',
    replace: true,
    scope: {
      item: '='
    },
    templateUrl: 'directives/componentPanel.html'
  };
}

export default componentPanel;
