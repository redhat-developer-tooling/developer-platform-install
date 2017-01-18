'use strict';

function progressBar() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      progress: '='
    },
    templateUrl: 'directives/progressBar.html'
  };
}

export default progressBar;
