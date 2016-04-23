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
        // 90 comes from 260 - longest path inside jbds and cygwin
        mCtrl.$setValidity('tooLong',value.length<=90)
        mCtrl.$setValidity('hasSpaces',!value.includes(' '));
        return value;
      }
      mCtrl.$parsers.push(pathValidation);
      mCtrl.$formatters.push(pathValidation);
    }
  };
}

export default pathValidator;
