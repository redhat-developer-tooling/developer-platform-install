'use strict';

let path = require('path');
let fs = require('fs-extra');
var rimraf = require('rimraf');

import JbosseapAutoInstallGenerator from './jbosseap-autoinstall';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

class JbosseapInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(JbosseapInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbosseap-autoinstall.xml');
    this.configFile = path.join(this.installerDataSvc.tempDir(), 'jbosseap-autoinstall.xml.variables');
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'jbosseap';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let version = /(\d+\.\d+\.\d+).*/.exec(this.version)[1];
    this.installGenerator = new JbosseapAutoInstallGenerator(this.installerDataSvc.jbosseapDir(), this.installerDataSvc.jdkDir(), version);
    let installer = new Installer(this.keyName, progress, success, failure);

    if(fs.existsSync(this.installerDataSvc.jbosseapDir())) {
      rimraf.sync(this.installerDataSvc.jbosseapDir());
    }

    Logger.info(this.keyName + ' - Generate jbosseap auto install file content');
    let data = this.installGenerator.fileContent();
    Logger.info(JbosseapInstall.KEY + ' - Generate jbosseap auto install file content SUCCESS');
    return Promise.resolve().then(()=> {
      return installer.writeFile(this.installConfigFile, data);
    }).then((result) => {
      return this.headlessInstall(installer, result);
    }).then(() => {
      let devstudio = this.installerDataSvc.getInstallable('devstudio');
      if(devstudio.installed) {
        devstudio.configureRuntimeDetection('jbosseap', this.installerDataSvc.jbosseapDir());
      } else {
        this.ipcRenderer.on('installComplete', (event, arg)=> {
          if(arg == 'devstudio') {
            devstudio.configureRuntimeDetection('jbosseap', this.installerDataSvc.jbosseapDir());
          }
        });
      }
      installer.succeed(true);
    }).catch((error) => {
      installer.fail(error);
    });
  }

  headlessInstall(installer) {
    Logger.info(this.keyName + ' - headlessInstall() called');
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

  isConfigurationValid() {
    let jdk = this.installerDataSvc.getInstallable('jdk');
    return jdk.isConfigured()
      && this.isConfigured()
      || this.isSkipped();
  }
}

function fromJson({ installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new JbosseapInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

JbosseapInstall.convertor = {fromJson};

export default JbosseapInstall;
