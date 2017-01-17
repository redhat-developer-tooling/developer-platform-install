'use strict';

let fs = require('fs-extra');
let child_process = require('child_process');
let unzip = require('unzip');
let targz = require('targz');

import Logger from '../../services/logger';

class Installer {

  constructor(key, progress, success, failure) {
    this.progress = progress;
    this.success = success;
    this.failure = failure;
    this.key = key;
  }

  exec(command, options) {
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

  execFile(file, args) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Execute ' + file + ' ' + args);
      child_process.execFile(file, args, {'maxBuffer': 1024*1024*2}, (error, stdout, stderr) => {
        if (error) {
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

  unzip(zipFile, extractTo, prefix) {
    return new Promise((resolve, reject) => {
      if(zipFile.endsWith('.tar.gz')) {
        targz.decompress({
          src: zipFile,
          dest: extractTo,
          tar: {
            map: function(header) {
              if (prefix && header.name.startsWith(prefix)) {
                header.name = header.name.substring(prefix.length);
              }
              return header;
            }
          }
        }, (err)=> {
          if(err) {
            Logger.error(this.key + ' - ' + err);
            reject(err);
          } else {
            Logger.info(this.key + ' - Extract ' + zipFile + ' to ' + extractTo + ' SUCCESS');
            resolve(true);
          }
        });
      } else if(zipFile.endsWith('.zip')) {
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
      } else {
        reject(`unsupported extension for ${zipFile}`);
      }
    });
  }

  moveFile(source, target) {
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

  copyFile(source, target) {
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

  writeFile(file, data) {
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
