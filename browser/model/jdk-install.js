'use strict';

let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import CDKInstall from './cdk';
import Util from './helpers/util';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, prefix) {
    super('OpenJDK','v8','Java Development Kit for running JBoss Developer Studio', 260, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;
    this.downloadedFileName = 'jdk.zip';
    this.bundledFile = path.join(path.join(path.normalize(__dirname), "../../.."), this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.existingVersion = '';
    this.minimumVersion = '1.8.0';
    this.jdkZipEntryPrefix = prefix;
  }

  isConfigured() {
    return (this.existingVersion
        && this.existingInstallLocation
        && this.existingInstall
        && this.existingVersion >= this.minimumVersion)
        || this.selected;
  }

  detectExistingInstall(cb = new function(){}) {
    let versionRegex = /version\s\"(\d+\.\d+\.\d+)_\d+\"/;
    let selectedFolder = '';

    let extension = '';
    let command;
    if (process.platform === 'win32') {
      // where java doesn't work good because it returns
      // hardlink created in C:\ProgramData\Oracle\Java\javapath
      command = 'java -XshowSettings';
    } else {
      command = 'which java';
    }
    Util.executeCommand('java -version', 2)
    .then((output) => {
      return new Promise((resolve, reject) => {
        let version = versionRegex.exec(output);
        if (version && version.length > 0) {
          this.existingVersion = version[1];
          resolve(true);
        } else {
          reject("No java detected");
        }
      });
    }).then((result) => {
      return Util.executeCommand(command, 2);
    }).then((output) => {
        var locationRegex = /java.home*\s=*\s(.*)[\s\S]/;
        var t = locationRegex.exec(output);
        if(t.length > 1) {
          this.existingInstallLocation = t[1];
          this.existingInstall = true;
          this.detected = true;
        }
        cb();
    }).catch((error) => {
      this.existingInstall = false;
      cb();
    });
  }

  static key() {
    return 'jdk';
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
    let cdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());
    if(!this.hasExistingInstall()) {
      progress.setStatus('Installing');
      let installer = new Installer(JdkInstall.key(), progress, success, failure);

      installer.unzip(this.downloadedFile, this.installerDataSvc.installDir())
          .then((result) => {
            return this.getFolderContents(this.installerDataSvc.installDir(), result);
          })
          .then((files) => {
            return this.getFileByName(this.jdkZipEntryPrefix, files)
          })
          .then((fileName) => {
            return this.renameFile(this.installerDataSvc.installDir(), fileName, this.installerDataSvc.jdkDir());
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
    //no need to setup anything for JDK
    progress.setStatus('Setting up');
    progress.setComplete();
    success();
  }

  getFolderContents(parentFolder, result) {
    return new Promise(function (resolve, reject) {
      fs.readdir(parentFolder, function(err, fileList) {
        if (err) {
          Logger.error(JdkInstall.key() + ' - ' + err);
          reject(err);
        } else {
          resolve(fileList);
        }
      });
    });
  }

  getFileByName(name, files) {
    return new Promise(function (resolve) {
      for (let fileName of files) {
        if (fileName.startsWith(name)) {
          resolve(fileName);
          break;
        }
      }
    });
  }

  renameFile(folder, oldName, newName) {
    let filePath = path.join(folder, oldName)
    Logger.info(JdkInstall.key() + ' - Rename ' + filePath + 'to ' + newName)
    return new Promise(function (resolve, reject) {
      fs.rename(filePath, newName, function(err) {
        if (err) {
          Logger.error(JdkInstall.key() + ' - ' + err);
          reject(err);
        } else {
          Logger.info(JdkInstall.key() + ' - Rename ' + filePath + 'to ' + newName + ' SUCCESS')
          resolve(true);
        }
      });
    });
  }
}

export default JdkInstall;
