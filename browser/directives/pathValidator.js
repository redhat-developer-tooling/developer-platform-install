'use strict'

import angular from 'angular';

let path = require('path');

function pathValidator() {
  return {
    require: 'ngModel',
    link: function(scope, element, attr, mCtrl) {
      function pathValidation(value) {
        if (path.isAbsolute(value)) {
          mCtrl.$setValidity('folderPath', true);
        } else {
          mCtrl.$setValidity('folderPath', false);
        }
        mCtrl.$setValidity('hasSpaces',!value.includes(' '));
        return value;
      }
      mCtrl.$parsers.push(pathValidation);
      mCtrl.$formatters.push(pathValidation);
    }
  };
}

export default pathValidator;
