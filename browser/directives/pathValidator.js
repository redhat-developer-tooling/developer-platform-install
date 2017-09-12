'use strict';

import fs from 'fs';
import path from 'path';
import Platform from '../services/platform';

let pathWindowsRegex = /^[a-zA-Z]:\\(?:[^#%\\/:*?"<>|\r\n]+\\)*[^#%\\/:*?"<>|\r\n]*$/;
let nonAsciiRegex = /[^\x00-\x7F]+/;

function pathValidator() {
  return {
    require: 'ngModel',
    link: function(scope, element, attr, mCtrl) {

      function validateFormatWindows(value) {
        return pathWindowsRegex.test(value);
      }

      function validateAscii(value) {
        return !nonAsciiRegex.test(value);
      }

      function validateLength(value) {
        return value.length<=90;
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
      if(Platform.OS == 'win32') {
        mCtrl.$validators['invalidAscii'] = validateAscii;
        mCtrl.$validators['invalidFormat'] = validateFormatWindows;
        mCtrl.$validators['invalidDisk'] = validateDisk;
      }
    }
  };
}

export default pathValidator;
