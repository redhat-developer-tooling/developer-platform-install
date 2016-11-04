'use strict'

import angular from 'angular';
import fs from 'fs';
import path from 'path';
import Platform from '../services/platform';

let pathWindowsRegex = /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/;

function pathValidator() {
  return {
    require: 'ngModel',
    link: function(scope, element, attr, mCtrl) {

      function validateFormatWindows(value) {
        let trimmedValue = value.trim();

        return pathWindowsRegex.test(value);
      }

      function validateLength(value) {
        return value.length<=90;
      }

      function hasNoSpaces(value) {
        return !value.includes(' ');
      }

      function validateDisk(value) {
        let stats = path.parse(value);
        return !stats.root.length == 0 && fs.existsSync(stats.root);
      }

      function isSelected(value) {
        return value.trim().length>0;
      }

      function isAbsolute(value) {
        return path.isAbsolute(value);
      }

      mCtrl.$validators['notSelected'] = isSelected;
      mCtrl.$validators['notAbsolute'] = isAbsolute;
      mCtrl.$validators['tooLong'] = validateLength;
      mCtrl.$validators['hasSpaces'] = hasNoSpaces;
      if(Platform.OS == 'win32') {
        mCtrl.$validators['invalidFormat'] = validateFormatWindows;
        mCtrl.$validators['invalidDisk'] = validateDisk;
      }
    }
  }
}

export default pathValidator;
