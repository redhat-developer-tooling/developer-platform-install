'use strict';

import path from 'path';
import Logger from '../services/logger';
import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import globby from 'globby';
import fs from 'fs-extra';
import pify from 'pify';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(CDKInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);

    this.sha256 = sha256sum;
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'cdk';
  }

  get minishiftExe() {
    return path.join(this.installerDataSvc.ocDir(), Platform.OS === 'win32' ? 'minishift.exe' : 'minishift');
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);
    let ocExe;
    let ocExePattern = Platform.OS === 'win32' ? '/**/oc.exe' : '/**/oc';
    let home;
    let driverName = 'virtualbox';
    return Promise.resolve().then(()=> {
      if(this.downloadedFile.endsWith('.exe') || path.parse(this.downloadedFile).ext == '') {
        return installer.copyFile(this.downloadedFile, this.minishiftExe);
      }
      return Promise.reject('Cannot process downloaded cdk distribution');
    }).then(()=> {
      return Platform.makeFileExecutable(this.minishiftExe);
    }).then(()=> {
      let hv = this.installerDataSvc.getInstallable('hyperv');
      if (hv && hv.hasOption('detected')) {
        driverName = 'hyperv';
        return Platform.getHypervAdminsGroupName().then((group)=>{
          installer.exec(
            `net localgroup "${group}" %USERDOMAIN%\\%USERNAME% /add`
          ).catch(()=>{});
        });
      }
    }).then(()=> {
      return installer.exec(
        'minishift stop', {env: this.createEnvironment()}
      ).catch(()=>Promise.resolve());
    }).then(()=> {
      return installer.exec(`minishift setup-cdk --force --default-vm-driver=${driverName}`, {env:this.createEnvironment()});
    }).then(()=> {
      return Platform.getUserHomePath();
    }).then((result)=> {
      home = Platform.ENV.MINISHIFT_HOME ? Platform.ENV.MINISHIFT_HOME : path.join(result, '.minishift');
      return globby(ocExePattern, {root: path.join(home, 'cache', 'oc')});
    }).then((files)=> {
      ocExe = files[0].replace(/\//g, path.sep);
      return Promise.resolve();
    }).then(()=> {
      return Platform.makeFileExecutable(ocExe);
    }).then(()=> {
      return Platform.addToUserPath([ocExe, this.minishiftExe]);
    }).then(()=> {
      return pify(fs.appendFile)(
        path.join(home, 'cdk'),
        `rhel.subscription.username=${this.installerDataSvc.username}`);
    }).then(()=> {
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
    });
  }

  createEnvironment() {
    let vboxInstall = this.installerDataSvc.getInstallable('virtualbox');
    let cygwinInstall = this.installerDataSvc.getInstallable('cygwin');
    let env = Object.assign({}, Platform.ENV);
    let newPath = [];
    let oldPath = Platform.ENV[Platform.PATH];

    if(vboxInstall) {
      newPath.push(vboxInstall.getLocation());
    }

    if(cygwinInstall) {
      newPath.push(cygwinInstall.getLocation());
    }

    newPath.push(this.installerDataSvc.ocDir());

    if(oldPath.trim()) {
      newPath.push(oldPath);
    }

    env[Platform.PATH] = newPath.join(path.delimiter);
    Logger.info(this.keyName + ' - Set PATH environment variable to \'' + env[Platform.PATH] + '\'');
    return env;
  }

  isConfigurationValid() {
    let cygwin = this.installerDataSvc.getInstallable('cygwin');
    return this.isConfigured()
      && this.virtualizationIsConfigured()
      && (!cygwin || cygwin.isConfigured())
      || this.isSkipped();
  }


  virtualizationIsConfigured() {
    let virtualbox = this.installerDataSvc.getInstallable('virtualbox');
    let hyperv = this.installerDataSvc.getInstallable('hyperv');
    return (virtualbox
      && virtualbox.isConfigured())
      || (hyperv
      && hyperv.isConfigured()
      || this.selectedOption !== 'install');
  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new CDKInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

CDKInstall.convertor = {fromJson};

export default CDKInstall;
