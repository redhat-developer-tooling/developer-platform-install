'use strict';

let child_process = require('child_process');
let fs = require('fs-extra');
import Platform from '../../services/platform';

class Util {

  static executeCommand(command, outputCode=1, options) {
    return new Promise((resolve, reject) => {
      if (Platform.OS == 'darwin') {
        if(options === undefined) {
          options = {};
        }
        if(options['env'] === undefined) {
          options.env = Object.assign({}, Platform.ENV);
        }
        if(options.env['PATH']) {
          options.env.PATH = options.env.PATH + ':/usr/local/bin';
        } else {
          options.env.PATH = '/usr/local/bin';
        }
      }
      child_process.exec(command, options, defaultCallback(resolve, reject, outputCode));
    });
  }

  static executeFile(file, args, outputCode=1) {
    return new Promise((resolve, reject) => {
      child_process.execFile(file, args, defaultCallback(resolve, reject, outputCode));
    });
  }

  static writeFile(file, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(file, data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  static folderContains(folder, fileNames) {
    return new Promise((resolve, reject) => {
      fs.readdir(folder, (err, files) => {
        if (err) {
          reject(err);
        } else {
          for (var i = 0; i < fileNames.length; i++) {
            if(files.indexOf(fileNames[i]) < 0) {
              reject(folder + ' does not contain ' + fileNames[i]);
              return;
            }
          }
          resolve(folder);
        }
      });
    });
  }

  static findText(file, text, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.readFile(file, encoding, (err, data) => {
        if(err) {
          reject(err);
        } else {
          let lines = data.toString().split('\n');
          let result;
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(text) > -1) {
              result = lines[i];
              break;
            }
          }
          if (result) {
            resolve(result);
          } else {
            reject('"' + text + '"' + ' not found in file ' + file);
          }
        }
      });
    });
  }

  static getRejectUnauthorized() {
    let value = Platform.ENV['DSI_REJECT_UNAUTHORIZED'];
    let result = true;
    try {
      result = JSON.parse(value);
    } catch (error) {
      /* continue regardless of error */
    }
    return result;
  }
}

function defaultCallback(resolve, reject, outputCode) {
  return function(error, stdout, stderr) {
    if (error && outputCode === 1) {
      reject(error);
    } else {
      if (outputCode === 2) {
        resolve(stderr.toString().trim());
      } else {
        resolve(stdout.toString().trim());
      }
    }
  };
}

export default Util;
