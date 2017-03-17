'use strict';

let path = require('path');
let fs = require('fs-extra');
let Glob = require('glob').Glob;
let replace = require('replace-in-file');

import DevstudioAutoInstallGenerator from './devstudio-autoinstall';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';
import CDKInstall from './cdk.js';
import Util from './helpers/util';
import Platform from '../services/platform';

class DevstudioInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, devstudioSha256, additionalLocations, additionalIus) {
    super(DevstudioInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);

    this.sha256 = devstudioSha256;
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'devstudio-autoinstall.xml');
    this.addOption('install', this.version, '', true);
    this.additionalLocations = additionalLocations;
    this.additionalIus = additionalIus;
  }

  static get KEY() {
    return 'devstudio';
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

  checkForExistingInstall(selection, data) {
    let pattern, directory;
    let versionRegex = /version\s(\d+)\.\d+\.\d+/;
    let matched = false;

    if(selection) {
      this.existingInstallLocation = selection[0];
    } else {
      this.ipcRenderer.send('checkComplete', DevstudioInstall.KEY);
      return;
    }

    if (Platform.OS === 'win32') {
      directory = selection ? selection[0] : 'c:';
      pattern = selection ? 'studio/devstudio.exe' : '**/studio/devstudio.exe';
    } else {
      directory = selection ? selection[0] : Platform.ENV[Platform.HOME];
      pattern = selection ? 'studio/devstudio' : '{*,*/*,*/*/*,*/*/*/*}/studio/devstudio';
    }

    let globster = new Glob(pattern, { cwd: directory, silent: true, nodir: true, strict : false});
    globster.on('match', (match) => {
      globster.pause();
      let devstudioRoot = path.join(directory, path.dirname(path.dirname(match)));
      this.checkVersion(devstudioRoot, versionRegex)
      .then((result) => {
        if (result) {
          matched = true;
          this.existingInstall = true;
          if (selection && data) {
            data[DevstudioInstall.KEY][1] = true;
          } else {
            this.existingInstallLocation = selection ? this.existingInstallLocation : devstudioRoot;
          }
          globster.abort();
          this.ipcRenderer.send('checkComplete', DevstudioInstall.KEY);
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
        if (data[DevstudioInstall.KEY]) {
          data[DevstudioInstall.KEY][1] = this.existingInstall;
        } else {
          data[DevstudioInstall.KEY] = [this, this.existingInstall];
        }
      }
      this.ipcRenderer.send('checkComplete', DevstudioInstall.KEY);
    });
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    this.installGenerator = new DevstudioAutoInstallGenerator(this.installerDataSvc.devstudioDir(), this.installerDataSvc.jdkDir(), this.version);
    let installer = new Installer(DevstudioInstall.KEY, progress, success, failure);

    Logger.info(DevstudioInstall.KEY + ' - Generate devstudio auto install file content');
    let data = this.installGenerator.fileContent();
    Logger.info(DevstudioInstall.KEY + ' - Generate devstudio auto install file content SUCCESS');

    installer.writeFile(this.installConfigFile, data)
      .then((result) => {
        return this.postJDKInstall(installer, result);
      })
      .then((result) => {
        installer.succeed(result);
      })
      .catch((error) => {
        installer.fail(error);
      });
  }

  setup(progress, success, failure) {
    if (this.hasExistingInstall()) {
      progress.setStatus('Setting up');
      let installer = new Installer(DevstudioInstall.KEY, progress, success, failure);
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.KEY);

      if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
        this.setupCdk().then((result) => {
          return this.setupJDK(jdkInstall, installer, result);
        })
        .then((result) => {
          installer.succeed(result);
        })
        .catch((error) => {
          installer.fail(error);
        });
      } else {
        Logger.info(DevstudioInstall.KEY + ' - JDK has not finished installing, listener created to be called when it has.');
        this.ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.KEY) {
            this.setupCdk().then(() => {
              return this.setupJDK(jdkInstall);
            })
            .then((result) => {
              installer.succeed(result);
            })
            .catch((error) => {
              installer.fail(error);
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
        Logger.info(DevstudioInstall.KEY + ' - Configure -vm parameter to ' + this.installerDataSvc.jdkRoot);
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
              Logger.info(DevstudioInstall.KEY + ' - Configure -vm parameter to ' + this.installerDataSvc.jdkRoot + ' SUCCESS');
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
        .then((res) => { resolve(res); })
        .catch((err) => { reject(err); });
      } else {
        Logger.info(DevstudioInstall.KEY + ' - JDK has not finished installing, listener created to be called when it has.');
        this.ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.KEY) {
            return this.headlessInstall(installer, result)
            .then((res) => { resolve(res); })
            .catch((err) => { reject(err); });
          }
        });
      }
    });
  }

  headlessInstall(installer) {
    Logger.info(DevstudioInstall.KEY + ' - headlessInstall() called');
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
    Logger.info(DevstudioInstall.KEY + ' - Append CDKServer runtime information to devstudio runtime location');
    return new Promise((resolve, reject) => {
      if(cdkInstall.isSkipped) {
        resolve(true);
      } else {
        fs.appendFile(
          path.join(this.installerDataSvc.devstudioDir(), 'studio', 'runtime_locations.properties'),
          'CDKServer=' + escapedPath + ',true\r\n',
          (err) => {
            if (err) {
              Logger.error(DevstudioInstall.KEY + ' - ' + err);
              reject(err);
            } else {
              Logger.info(DevstudioInstall.KEY + ' - Append CDKServer runtime information to devstudio runtime location SUCCESS');
              resolve(true);
            }
          }
        );
      }
    });
  }
}

export default DevstudioInstall;
