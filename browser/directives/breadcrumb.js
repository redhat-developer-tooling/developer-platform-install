'use strict'

import angular from 'angular';

function breadcrumb($state) {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: './directives/breadcrumbs.html',
    compile: (tElement, tAttrs) => {
      return ($scope, $elem, $attr) => {
        $scope.show = (state) => {
          if (!angular.isDefined(state.data)) {
            return false;
          }
          return true;
        };
      }
    },
    controller: ['$scope', '$state', ($scope, $state) => {
      $scope.$navItems = $state.get();

      $scope.isCurrent = (state) => {
        return $state.$current.name == state.name;
      };
    }]
  }
}

export default breadcrumb;
