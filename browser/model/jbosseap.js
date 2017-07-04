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
    Logger.info(this.keyName + ' - Generate jbosseap auto install file content SUCCESS');
    return installer.writeFile(this.installConfigFile, data)
      .then((result) => {
        installer.writeFile(this.configFile, 'adminPassword=changeit');
        return this.postJDKInstall(installer, result);
      })
      .then(() => {
        let devstudio = this.installerDataSvc.getInstallable('devstudio');
        if(devstudio.installed) {
          this.configureRuntimeDetection();
        } else {
          let that = this;
          this.ipcRenderer.on('installComplete', function(event, arg) {
            if(arg == 'devstudio') {
              that.configureRuntimeDetection();
            }
          });
        }
        installer.succeed(true);
      })
      .catch((error) => {
        installer.fail(error);
      });
  }

  configureRuntimeDetection() {
    let runtimeproperties = path.join(this.installerDataSvc.devstudioDir(), 'studio', 'runtime_locations.properties');
    let escapedLocation = this.installerDataSvc.jbosseapDir().replace(/\\/g, '\\\\').replace(/\:/g, '\\:');
    if(fs.existsSync(runtimeproperties)) {
      fs.appendFile(runtimeproperties, `\njbosseap=${escapedLocation},true`).catch((error)=>{
        Logger.error(this.keyName + ' - error occured during runtime detection configuration in DevStudio');
        Logger.error(this.keyName + ` -  ${error}`);
      });
    }
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
      this.installConfigFile
    ];
    let res = installer.execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts
    );

    return res;
  }
}

function fromJson({ installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new JbosseapInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

JbosseapInstall.convertor = {fromJson};

export default JbosseapInstall;
