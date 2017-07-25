'use strict';

function componentPanel() {
  return {
    controller: ('componentController', ['$scope', 'electron', function($scope, electron) {
      $scope.openUrl = function(url) {
        electron.shell.openExternal(url);
      }
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
