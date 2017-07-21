'use strict';

function componentPanel() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      item: '='
    },
    templateUrl: 'directives/componentPanel.html'
  };
}

export default componentPanel;
