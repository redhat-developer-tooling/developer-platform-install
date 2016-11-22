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
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Execute command ' + command);
      child_process.exec(command, options, (error, stdout, stderr) => {
        if (error) {
          Logger.error(this.key + ' - ' + error);
          Logger.error(this.key + ' - ' + stderr);
          reject(error);
        } else {
          if (stdout) {
            Logger.info(this.key + ' - ' + stdout);
          }
          Logger.info(this.key + ' - Execute ' + command + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  execFile(file, args, result) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Execute ' + file + ' ' + args);
      child_process.execFile(file, args, {'maxBuffer': 1024*1024*2} , (error, stdout, stderr) => {
        // vagrant exits with code 3010
        if (error && error.code !== 3010) {
          Logger.error(this.key + ' - ' + error);
          Logger.error(this.key + ' - ' + stderr);
          reject(error);
        } else {
          if (stdout) {
            Logger.info(this.key + ' - ' + stdout);
          }
          Logger.info(this.key + ' - Execute ' + file + ' ' + args + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  unzip(zipFile, extractTo, result) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Extract ' + zipFile + ' to ' + extractTo);
      fs.createReadStream(zipFile)
      .pipe(unzip.Extract({path: extractTo}))
      .on('close', () => {
        Logger.info(this.key + ' - Extract ' + zipFile + ' to ' + extractTo + ' SUCCESS');
        resolve(true);
      })
      .on('error', (err) => {
        Logger.error(this.key + ' - ' + err);
        reject(err);
      });
    });
  }

  moveFile(source, target, result) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Move ' + source + ' to ' + target);
      fs.move(source, target, (err) => {
        if (err) {
          Logger.error(this.key + ' - ' + err);
          reject(err);
        } else {
          Logger.info(this.key + ' - Move ' + source + ' to ' + target + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  copyFile(source, target, result) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Copy ' + source + ' to ' + target);
      fs.copy(source, target, (err) => {
        if (err) {
          Logger.error(this.key + ' - ' + err);
          reject(err);
        } else {
          Logger.info(this.key + ' - Copy ' + source + ' to ' + target + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }

  writeFile(file, data, result) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Write ' + file);
      fs.writeFile(file, data, (err) => {
        if (err) {
          Logger.error(this.key + ' - ' + err);
          reject(err);
        } else {
          Logger.info(this.key + ' - Write ' + file + ' SUCCESS');
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
    this.progress.setStatus('Failed');
    return this.failure(error);
  }

}

export default Installer;
