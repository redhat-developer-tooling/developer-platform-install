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
    }]),
    restrict: 'E',
    replace: true,
    scope: {
      item: '='
    },
    transclude: true,
    templateUrl: 'directives/componentPanel.html'
  };
}

export default componentPanel;
