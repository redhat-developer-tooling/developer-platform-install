'use strict';

let fs = require('fs-extra');
let child_process = require('child_process');
let unzip = require('unzip');

import Logger from '../../services/logger';

class Installer {

  constructor(key, progress, success, failure) {
    this.progress = progress;
    this.success = success;
    this.failure = failure;
    this.key = key;
  }

  exec(command, options, result) {
    let self = this;
    return new Promise(function (resolve, reject) {
      Logger.info(self.key + ' - Execute ' + command);
      child_process.exec(command, options, function(error, stdout, stderr) {
        if (error && error !== '') {
          Logger.error(self.key + ' - ' + error);
          Logger.error(self.key + ' - ' + stderr);
          reject(error);
        } else {
          if (stdout && stdout != '') {
            Logger.info(self.key + ' - ' + stdout);
          }
          Logger.info(self.key + ' - Execute ' + command + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  execFile(file, args, result) {
    let self = this;
    return new Promise(function(resolve, reject) {
      Logger.info(self.key + ' - Execute ' + file + ' ' + args);
      child_process.execFile(file, args, function(error, stdout, stderr) {
        if (error && error !== '') {
          Logger.error(self.key + ' - ' + error);
          Logger.error(self.key + ' - ' + stderr);
          reject(error);
        } else {
          if (stdout && stdout != '') {
            Logger.info(self.key + ' - ' + stdout);
          }
          Logger.info(self.key + ' - Execute ' + file + ' ' + args + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  unzip(zipFile, extractTo, result) {
    let self = this;
    return new Promise(function (resolve, reject) {
      Logger.info(self.key + ' - Extract ' + zipFile + ' to ' + extractTo);
      fs.createReadStream(zipFile)
      .pipe(unzip.Extract({path: extractTo}))
      .on('close', () => {
        Logger.info(self.key + ' - Extract ' + zipFile + ' to ' + extractTo + ' SUCCESS');
        resolve(true);
      })
      .on('error', (err) => {
        Logger.error(self.key + ' - ' + err);
        reject(err);
      });
    });
  }

  moveFile(source, target, result) {
    let self = this;
    return new Promise(function (resolve, reject) {
      Logger.info(self.key + ' - Move ' + source + ' to ' + target);
      fs.move(source, target, (err) => {
        if (err) {
          Logger.error(self.key + ' - ' + err);
          reject(err);
        } else {
          Logger.info(self.key + ' - Move ' + source + ' to ' + target + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  writeFile(file, data, result) {
    let self = this;
    return new Promise(function (resolve, reject) {
      Logger.info(self.key + ' - Write ' + file);
      fs.writeFile(file, data, function (err) {
        if (err) {
          Logger.error(self.key + ' - ' + err);
          reject(err);
        } else {
          Logger.info(self.key + ' - Write ' + file + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  succeed(done) {
    if (done) {
      this.progress.setComplete();
      this.success();
    }
  }

  fail(error) {
    return this.failure(error);
  }

}

export default Installer;
