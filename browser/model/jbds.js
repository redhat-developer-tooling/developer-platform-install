'use strict';

let request = require('request');
let path = require('path');
let fs = require('fs');
let ipcRenderer = require('electron').ipcRenderer;
let Glob = require("glob").Glob;
let replace = require("replace-in-file");

import JbdsAutoInstallGenerator from './jbds-autoinstall';
import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';
import Util from './helpers/util';

class JbdsInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('jbds',
          'RED HAT JBOSS DEVELOPER STUDIO',
          'v9.1',
          'An IDE with tooling that will help you easily code, test, and deploy your projects.',
          1600,
          downloadUrl,
          installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFileName = 'jbds.jar';
    this.bundledFile = path.join(path.join(path.normalize(__dirname), "../../.."), this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'jbds.jar');
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
    this.addOption('install', '9.1.0', '', true);
  }

  static key() {
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

  checkForExistingInstall(selection, data) {
    let pattern, directory;
    let versionRegex = /version\s(\d+)\.\d+\.\d+/;
    let matched = false;

    if(selection) {
      this.existingInstallLocation = selection[0];
    } else {
      ipcRenderer.send('checkComplete', JbdsInstall.key());
      return;
    }

    if (process.platform === 'win32') {
      directory = selection ? selection[0] : 'c:';
      pattern = selection ? 'studio/jbdevstudio.exe' : '**/studio/jbdevstudio.exe';
    } else {
      directory = selection ? selection[0] : process.env.HOME;
      pattern = selection ? 'studio/jbdevstudio' : '{*,*/*,*/*/*,*/*/*/*}/studio/jbdevstudio';
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
            data[JbdsInstall.key()][1] = true;
          } else {
            this.existingInstallLocation = selection ? this.existingInstallLocation : jbdsRoot;
          }
          globster.abort();
          ipcRenderer.send('checkComplete', JbdsInstall.key());
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
        if (data[JbdsInstall.key()]) {
          data[JbdsInstall.key()][1] = this.existingInstall;
        } else {
          data[JbdsInstall.key()] = [this, this.existingInstall];
        }
      }
      ipcRenderer.send('checkComplete', JbdsInstall.key());
    });
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    if(!this.hasExistingInstall() && !fs.existsSync(this.bundledFile)) {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);
      let downloader = new Downloader(progress, success, failure);
      downloader.setWriteStream(writeStream);
      downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = this.bundledFile;
      success();
    }
  }

  install(progress, success, failure) {
    let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());
    if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
      this.postInstall(progress, success, failure);
    } else {
      progress.setStatus('Waiting for JDK to finish installation');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'jdk') {
          this.postInstall(progress, success, failure);
        }
      });
    }
  }

  postInstall(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === "install") {
      this.installGenerator = new JbdsAutoInstallGenerator(this.installerDataSvc.jbdsDir(), this.installerDataSvc.jdkDir());
      let installer = new Installer(JbdsInstall.key(), progress, success, failure);

      Logger.info(JbdsInstall.key() + ' - Generate JBDS auto install file content');
      let data = this.installGenerator.fileContent();
      Logger.info(JbdsInstall.key() + ' - Generate JBDS auto install file content SUCCESS');

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
      let installer = new Installer(JbdsInstall.key(), progress, success, failure);
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());

      if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
        this.setupCdk()
            .then((result) => {
              return this.setupJDK(jdkInstall, installer, result)
            })
            .then((result) => {
              return installer.succeed(result);
            })
            .catch((error) => {
              return installer.fail(error);
            });
      } else {
        Logger.info(JbdsInstall.key() + ' - JDK has not finished installing, listener created to be called when it has.');
        ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.key()) {
            this.setupCdk()
                .then((result) => {
                  return this.setupJDK(jdkInstall, installer, result)
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
    //for when the user has JBDS but wants to install JDK anyway
    return new Promise((resolve, reject) => {
      if (!jdk.hasExistingInstall()) {
        Logger.info(JbdsInstall.key() + ' - Configure -vm parameter to ' + this.installerDataSvc.jdkRoot);
        let config = path.join(this.existingInstallLocation, 'studio', 'jbdevstudio.ini');
        let javaExecutable = path.join(this.installerDataSvc.jdkRoot, 'bin', 'java');
        if (process.platform === 'win32') {
          javaExecutable += 'w.exe';
        }

        replace({
          files: config,
          replace: /-vm\s+((\D:\\(.+\\)+javaw\.exe)|(\/(.+\/)+java))/,
          with: '-vm \n' + javaExecutable
        }, (error, changedFiles) => {
          if (error) {
            reject(error)
          } else {
            if (changedFiles.length !== 1) {
              reject('jbdevstudio.ini was not changed properly');
            } else {
              Logger.info(JbdsInstall.key() + ' - Configure -vm parameter to ' + this.installerDataSvc.jdkRoot + ' SUCCESS');
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
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());

      if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
        return this.headlessInstall(installer, result)
        .then((res) => { return resolve(res); })
        .catch((err) => { return reject(err); });
      } else {
        Logger.info(JbdsInstall.key() + ' - JDK has not finished installing, listener created to be called when it has.');
        ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.key()) {
            return this.headlessInstall(installer, result)
            .then((res) => { return resolve(res); })
            .catch((err) => { return reject(err); });
          }
        });
      }
    });
  }

  headlessInstall(installer, promise) {
    Logger.info(JbdsInstall.key() + ' - headlessInstall() called');
    let javaOpts = [
      '-DTRACE=true',
      '-jar',
      this.downloadedFile,
      this.installConfigFile
    ];
    let res = installer.execFile(path.join(this.installerDataSvc.jdkDir(), 'bin', 'java.exe'), javaOpts)
      .then((result) => { return this.setupCdk(result);});

    return res;
  }

  setupCdk(result) {
    let escapedPath = this.installerDataSvc.cdkVagrantfileDir().replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    Logger.info(JbdsInstall.key() + ' - Append CDKServer runtime information to JBDS runtime location');
    return new Promise((resolve, reject) => {
      fs.appendFile(
        path.join(this.installerDataSvc.jbdsDir(), 'studio', 'runtime_locations.properties'),
        'CDKServer=' + escapedPath + ',true\r\n',
        (err) => {
          if (err) {
            Logger.error(JbdsInstall.key() + ' - ' + err);
            reject(err);
          } else {
            Logger.info(JbdsInstall.key() + ' - Append CDKServer runtime information to JBDS runtime location SUCCESS');
            resolve(true);
          }
        });
    });
  }
}

export default JbdsInstall;
