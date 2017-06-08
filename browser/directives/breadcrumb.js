'use strict';

function breadcrumb() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'directives/breadcrumbs.html',
    compile: () => {
      return ($scope) => {
        $scope.show = (state) => angular.isDefined(state.data);
      };
    },
    controller: ['$scope', '$state', ($scope, $state) => {
      $scope.$navItems = $state.get();
      $scope.isCurrent = (state) => $state.$current.name == state.name;
    }]
  };
}

export default breadcrumb;
