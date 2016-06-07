'use strict';

let child_process = require('child_process');
let fs = require('fs');
let path = require('path');

class Util {
  static executeCommand(command, outputCode) {
    return new Promise((resolve, reject) => {
      child_process.exec(command, (error, stdout, stderr) => {
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

  static executeFile(file, args, outputCode) {
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

  static folderContains(folder, fileNames) {
    return new Promise((resolve, reject) => {
      fs.readdir(folder, (err, files) => {
        if (err) {
          reject(err);
        } else {
          for (var i = 0; i < fileNames.length; i++) {
            if(!files.includes(fileNames[i])) {
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
            if (lines[i].includes(text)) {
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

  static resolveFile(relativePath, filename) {
    let pathForBuild = path.join('resources', 'app.asar');
    let fileForTests = path.resolve(path.join(relativePath, filename));
    let fileForRT = path.join(path.resolve('.'), pathForBuild, relativePath, filename);

    let reqs;
    if (fs.existsSync(fileForTests)) {
      reqs = require(fileForTests);
    } else if ( fs.existsSync(fileForRT) ) {
      reqs = require(fileForRT);
    }

    return reqs;
  }
}

export default Util;
