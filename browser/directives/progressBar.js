'use strict';

function progressBar() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      productName: '=',
      productVersion: '=',
      productDesc: '=',
      current: '=',
      min: '=',
      max: '=',
      label: '=',
      status: '='
    },
    templateUrl: 'directives/progressBar.html'
  };
}

export default progressBar;
