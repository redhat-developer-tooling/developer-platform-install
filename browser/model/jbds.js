'use strict';

let path = require('path');
let fs = require('fs-extra');
let Glob = require('glob').Glob;
let replace = require('replace-in-file');

import JbdsAutoInstallGenerator from './jbds-autoinstall';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';
import CDKInstall from './cdk.js';
import Util from './helpers/util';
import Platform from '../services/platform';

class JbdsInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, targetFolderName, jbdsSha256) {
    super(JbdsInstall.KEY, 1600, downloadUrl, installFile, targetFolderName, installerDataSvc, true);

    this.downloadedFileName = 'jbds.jar';
    this.jbdsSha256 = jbdsSha256;
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'jbds';
  }

  checkVersion(location, regex) {
    return new Promise(function (resolve) {
      return Util.findText(path.join(location, 'readme.txt'), 'version')
      .then((text) => {
        if(regex.exec(text)[1] >= 9) {
          return resolve(true);
        } else {
          return resolve(false);
        }
      });
    });
  }

  detectExistingInstall(cb = function(){}) {
    cb();
  }

  checkForExistingInstall(selection, data) {
    let pattern, directory;
    let versionRegex = /version\s(\d+)\.\d+\.\d+/;
    let matched = false;

    if(selection) {
      this.existingInstallLocation = selection[0];
    } else {
      this.ipcRenderer.send('checkComplete', JbdsInstall.KEY);
      return;
    }

    if (Platform.OS === 'win32') {
      directory = selection ? selection[0] : 'c:';
      pattern = selection ? 'studio/devstudio.exe' : '**/studio/devstudio.exe';
    } else {
      directory = selection ? selection[0] : Platform.ENV[Platform.HOME];
      pattern = selection ? 'studio/devstudio' : '{*,*/*,*/*/*,*/*/*/*}/studio/devstudio';
    }

    let globster = new Glob(pattern, { cwd: directory, silent: true, nodir: true , strict : false});
    globster.on('match', (match) => {
      globster.pause();
      let jbdsRoot = path.join(directory, path.dirname(path.dirname(match)));
      this.checkVersion(jbdsRoot, versionRegex)
      .then((result) => {
        if (result) {
          matched = true;
          this.existingInstall = true;
          if (selection && data) {
            data[JbdsInstall.KEY][1] = true;
          } else {
            this.existingInstallLocation = selection ? this.existingInstallLocation : jbdsRoot;
          }
          globster.abort();
          this.ipcRenderer.send('checkComplete', JbdsInstall.KEY);
        } else {
          globster.resume();
        }
      });
    }).on('end', () => {
      if (!matched) {
        if (data && selection) {
          this.existingInstall = false;
        }
      } else {
        if (data && selection) {
          this.existingInstall = true;
        }
      }
      if(data && selection) {
        if (data[JbdsInstall.KEY]) {
          data[JbdsInstall.KEY][1] = this.existingInstall;
        } else {
          data[JbdsInstall.KEY] = [this, this.existingInstall];
        }
      }
      this.ipcRenderer.send('checkComplete', JbdsInstall.KEY);
    });
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === 'install') {
      this.installGenerator = new JbdsAutoInstallGenerator(this.installerDataSvc.jbdsDir(), this.installerDataSvc.jdkDir(), this.version);
      let installer = new Installer(JbdsInstall.KEY, progress, success, failure);

      Logger.info(JbdsInstall.KEY + ' - Generate devstudio auto install file content');
      let data = this.installGenerator.fileContent();
      Logger.info(JbdsInstall.KEY + ' - Generate devstudio auto install file content SUCCESS');

      installer.writeFile(this.installConfigFile, data)
        .then((result) => {
          return this.postJDKInstall(installer, result);
        })
        .then((result) => {
          return installer.succeed(result);
        })
        .catch((error) => {
          return installer.fail(error);
        });
    } else {
      success();
    }
  }

  setup(progress, success, failure) {
    if (this.hasExistingInstall()) {
      progress.setStatus('Setting up');
      let installer = new Installer(JbdsInstall.KEY, progress, success, failure);
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.KEY);

      if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
        this.setupCdk()
            .then((result) => {
              return this.setupJDK(jdkInstall, installer, result);
            })
            .then((result) => {
              return installer.succeed(result);
            })
            .catch((error) => {
              return installer.fail(error);
            });
      } else {
        Logger.info(JbdsInstall.KEY + ' - JDK has not finished installing, listener created to be called when it has.');
        this.ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.KEY) {
            this.setupCdk()
                .then((result) => {
                  return this.setupJDK(jdkInstall, installer, result);
                })
                .then((result) => {
                  return installer.succeed(result);
                })
                .catch((error) => {
                  return installer.fail(error);
                });
          }
        });
      }
    } else {
      success();
    }
  }

  setupJDK(jdk, installer, result) {
    //for when the user has devstudio but wants to install JDK anyway
    return new Promise((resolve, reject) => {
      if (!jdk.hasExistingInstall()) {
        Logger.info(JbdsInstall.KEY + ' - Configure -vm parameter to ' + this.installerDataSvc.jdkRoot);
        let config = path.join(this.existingInstallLocation, 'studio', 'devstudio.ini');
        let javaExecutable = path.join(this.installerDataSvc.jdkRoot, 'bin', 'javaw');

        replace({
          files: config,
          replace: /-vm\s+((\D:\\(.+\\)+javaw\.exe)|(\/(.+\/)+java))/,
          with: '-vm \n' + javaExecutable
        }, (error, changedFiles) => {
          if (error) {
            reject(error);
          } else {
            if (changedFiles.length !== 1) {
              reject('devstudio.ini was not changed properly');
            } else {
              Logger.info(JbdsInstall.KEY + ' - Configure -vm parameter to ' + this.installerDataSvc.jdkRoot + ' SUCCESS');
              resolve(true);
            }
          }
        });
      } else {
        resolve(true);
      }
    });
  }

  postJDKInstall(installer, result) {
    return new Promise((resolve, reject) => {
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.KEY);

      if (jdkInstall.isInstalled()) {
        return this.headlessInstall(installer, result)
        .then((res) => { return resolve(res); })
        .catch((err) => { return reject(err); });
      } else {
        Logger.info(JbdsInstall.KEY + ' - JDK has not finished installing, listener created to be called when it has.');
        this.ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.KEY) {
            return this.headlessInstall(installer, result)
            .then((res) => { return resolve(res); })
            .catch((err) => { return reject(err); });
          }
        });
      }
    });
  }

  headlessInstall(installer, promise) {
    Logger.info(JbdsInstall.KEY + ' - headlessInstall() called');
    let javaOpts = [
      '-DTRACE=true',
      '-jar',
      this.downloadedFile,
      this.installConfigFile
    ];
    let res = installer.execFile(path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts)
      .then((result) => { return this.setupCdk(result);});

    return res;
  }

  setupCdk(result) {
    let cdkInstall = this.installerDataSvc.getInstallable(CDKInstall.KEY);
    let escapedPath = this.installerDataSvc.cdkVagrantfileDir().replace(/\\/g, '\\\\').replace(/:/g, '\\:');
    Logger.info(JbdsInstall.KEY + ' - Append CDKServer runtime information to devstudio runtime location');
    return new Promise((resolve, reject) => {
      if(cdkInstall.isSkipped) {
        resolve(true);
      } else {
        fs.appendFile(
          path.join(this.installerDataSvc.jbdsDir(), 'studio', 'runtime_locations.properties'),
          'CDKServer=' + escapedPath + ',true\r\n',
          (err) => {
            if (err) {
              Logger.error(JbdsInstall.KEY + ' - ' + err);
              reject(err);
            } else {
              Logger.info(JbdsInstall.KEY + ' - Append CDKServer runtime information to devstudio runtime location SUCCESS');
              resolve(true);
            }
          });
      }
    });
  }
}

export default JbdsInstall;
