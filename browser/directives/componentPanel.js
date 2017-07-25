'use strict';

function componentPanel() {
  return {
    controller: 'ConfirmController as confCtrl',
    restrict: 'E',
    replace: true,
    scope: {
      item: '='
    },
    templateUrl: 'directives/componentPanel.html'
  };
}

export default componentPanel;
