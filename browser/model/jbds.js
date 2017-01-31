'use strict';

let path = require('path');
let fs = require('fs-extra');
let replace = require('replace-in-file');

import JbdsAutoInstallGenerator from './jbds-autoinstall';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';
import CDKInstall from './cdk.js';
import Util from './helpers/util';

class JbdsInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, fileName, targetFolderName, jbdsSha256, key=JbdsInstall.KEY, additionalLocations, additionalIus) {
    super(key, 1600, downloadUrl, fileName, targetFolderName, installerDataSvc, true);

    this.jbdsSha256 = jbdsSha256;
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
    this.addOption('install', this.version, '', true);
    this.additionalLocations = additionalLocations;
    this.additionalIus = additionalIus;
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

  detectExistingInstall(cb = function() {}) {
    cb();
  }

  checkForExistingInstall() {

  }

  isDownloadRequired() {
    if(this.keyName !== 'jbds') {
      let jbds = this.installerDataSvc.getInstallable('jbds');
      return !jbds.hasOption('install');
    }
    return this.useDownload;
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === 'install') {
      this.installGenerator = new JbdsAutoInstallGenerator(this.getLocation(), this.installerDataSvc.jdkDir(), this.version, this.additionalLocations, this.additionalIus);
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
                .then(() => {
                  return this.setupJDK(jdkInstall);
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

  setupJDK(jdk) {
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

  headlessInstall(installer) {
    Logger.info(JbdsInstall.KEY + ' - headlessInstall() called');
    let javaOpts = [
      '-DTRACE=true',
      '-jar',
      this.downloadedFile,
      this.installConfigFile
    ];
    let res = installer.execFile(path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts)
      .then(()=> this.setupCdk());

    return res;
  }

  setupCdk() {
    let cdkInstall = this.installerDataSvc.getInstallable(CDKInstall.KEY);
    let escapedPath = this.installerDataSvc.cdkDir().replace(/\\/g, '\\\\').replace(/:/g, '\\:');
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
