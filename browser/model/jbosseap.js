'use strict';

let path = require('path');
let fs = require('fs-extra');
var rimraf = require('rimraf');

import JbosseapAutoInstallGenerator from './jbosseap-autoinstall';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import Platform from '../services/platform'
import JdkInstall from './jdk-install';

class JbosseapInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, jbosseapSha256) {
    super(JbosseapInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = jbosseapSha256;
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
    let installer = new Installer(JbosseapInstall.KEY, progress, success, failure);

    if(fs.existsSync(this.installerDataSvc.jbosseapDir())) {
      rimraf.sync(this.installerDataSvc.jbosseapDir());
    }

    Logger.info(JbosseapInstall.KEY + ' - Generate jbosseap auto install file content');
    let data = this.installGenerator.fileContent();
    Logger.info(JbosseapInstall.KEY + ' - Generate jbosseap auto install file content SUCCESS');
    return Promise.resolve().then(()=> {
      return installer.writeFile(this.installConfigFile, data);
    }).then((result) => {
      return this.postJDKInstall(installer, result);
    }).then(() => {
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
    }).catch((error) => {
      installer.fail(error);
    });
  }

  configureRuntimeDetection() {
    let runtimeproperties =  Platform.OS === 'win32' ? path.join(this.installerDataSvc.devstudioDir(), 'studio', 'runtime_locations.properties') : path.join(this.installerDataSvc.devstudioDir(), 'studio/devstudio.app/Contents/Eclipse', 'runtime_locations.properties');
    let escapedLocation = this.installerDataSvc.jbosseapDir().replace(/\\/g, '\\\\').replace(/\:/g, '\\:');
    if(fs.existsSync(runtimeproperties)) {
      fs.appendFile(runtimeproperties, `\njbosseap=${escapedLocation},true`).catch((error)=>{
        Logger.error(JbosseapInstall.KEY + ' - error occured during runtime detection configuration in DevStudio');
        Logger.error(JbosseapInstall.KEY + ` -  ${error}`);
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
        Logger.info(JbosseapInstall.KEY + ' - JDK has not finished installing, listener created to be called when it has.');
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
    Logger.info(JbosseapInstall.KEY + ' - headlessInstall() called');
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

export default JbosseapInstall;
