'use strict';

let fs = require('fs-extra');
let targz = require('targz');
let unzip = require('unzip-stream');
let mkdirp = require('mkdirp');
let child_process = require('child_process');

import sudo from 'sudo-prompt';
import Logger from '../../services/logger';
import path from 'path';

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

  execElevated(command, options = {name: 'Red Hat Development Suite', icns: path.resolve(__dirname + '/../../../resources/devsuite.icns')}) {
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Execute command ' + command);
      sudo.exec(command, options, (error, stdout, stderr) => {
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
    })
  }

  execFile(file, args, options = {}) {
    options.maxBuffer = 1024*1024*2;
    return new Promise((resolve, reject) => {
      Logger.info(this.key + ' - Execute ' + file + ' ' + args);
      child_process.execFile(file, args, options, (error, stdout, stderr) => {
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
        fs.createReadStream(zipFile).pipe(unzip.Parse())
          .on('entry', (entry)=> {
            try {
              var fileName = entry.path;
              let f = fileName.substring(fileName.indexOf('/')+1);
              let dest = path.join(extractTo, ...f.split('/'));
              if (entry.type === 'File') {
                entry.pipe(fs.createWriteStream(dest));
              } else {
                mkdirp.sync(dest);
                entry.autodrain();
              }
            } catch(err) {
              reject(err);
            }
          }).on('error', function (error) {
            reject(error);
          }).on('close', ()=> {
            resolve();
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
    done && this.success();
  }

  fail(error) {
    this.progress.setStatus('Failed');
    return this.failure(error);
  }

}

export default Installer;
