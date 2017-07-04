'use strict';

let path = require('path');
let fs = require('fs-extra');
var rimraf = require('rimraf');

import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

class FusePlatformInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(FusePlatformInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'fuseplatform';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let fuseplatformDir = this.installerDataSvc.fuseplatformDir();
    let installer = new Installer(FusePlatformInstall.KEY, progress, success, failure);
    let fusetooljar = path.join(fuseplatformDir, 'fuse-eap-installer-6.3.0.redhat-187.jar');
    return Promise.resolve().then(()=> {
      return installer.copyFile(this.downloadedFile, fusetooljar);
    }).then((result)=> {
      return this.postJDKInstall(installer, result);
    }).then(()=> {
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
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
        Logger.info(this.keyName + ' - JDK has not finished installing, listener created to be called when it has.');
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
    Logger.info(this.keyName + ' - headlessInstall() called');
    let javaOpts = [
      '-DTRACE=true',
      '-jar',
      this.downloadedFile,
      this.installerDataSvc.jbosseapDir()
    ];
    let res = installer.execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts
    );

    return res;
  }
}

function fromJson({ installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new FusePlatformInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

FusePlatformInstall.convertor = {fromJson};

export default FusePlatformInstall;
