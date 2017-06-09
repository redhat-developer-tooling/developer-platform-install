'use strict';

let path = require('path');

import DevstudioAutoInstallGenerator from './devstudio-autoinstall';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

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

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    this.installGenerator = new DevstudioAutoInstallGenerator(this.installerDataSvc.devstudioDir(), this.installerDataSvc.jdkDir(), this.version);
    let installer = new Installer(DevstudioInstall.KEY, progress, success, failure);

    Logger.info(DevstudioInstall.KEY + ' - Generate devstudio auto install file content');
    let data = this.installGenerator.fileContent();
    Logger.info(DevstudioInstall.KEY + ' - Generate devstudio auto install file content SUCCESS');

    return installer.writeFile(this.installConfigFile, data)
      .then((result) => {
        return this.postJDKInstall(installer, result);
      })
      .then(() => {
        installer.succeed(true);
      })
      .catch((error) => {
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
    let res = installer.execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts
    );

    return res;
  }
}

export default DevstudioInstall;
