'use strict';

let child_process = require('child_process');
let fs = require('fs');
let path = require('path');

class Util {
  static executeCommand(command, outputCode) {
    return new Promise((resolve, reject) => {
      let options = {
        env : Object.assign({},process.env)
      };
      if (process.platform == 'darwin') {
          options.env.PATH = options.env.PATH + ':/usr/local/bin';
      }
      child_process.exec(command, options, (error, stdout, stderr) => {
        if (error && outputCode === 1) {
          reject(error);
        } else {
          if (outputCode === 2) {
            resolve(stderr.toString().trim());
          } else {
            resolve(stdout.toString().trim());
          }
        }
      })
    });
  }

  static executeFile(file, args, outputCode=1) {
    return new Promise((resolve, reject) => {
      child_process.execFile(file, args, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          if (outputCode === 2) {
            resolve(stderr.toString().trim());
          } else {
            resolve(stdout.toString().trim());
          }
        }
      })
    });
  }

  static writeFile(key, file, data) {
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
          reject(err)
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

  // Execute a list of Promise return functions in series
  static runPromiseSequence(list) {
    return list.reduce(
      function(pacc, fn) {
        return pacc.then(fn);
      },Promise.resolve());
  }

  static getRejectUnauthorized() {
    let value = process.env['DSI_REJECT_UNAUTHORIZED'];
    let result = true;
    try {
      result = JSON.parse(value);
    } catch (error) {
    }
    return result;
  }
}

export default Util;
