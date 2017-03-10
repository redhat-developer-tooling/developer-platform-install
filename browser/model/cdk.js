'use strict';

import path from 'path';
import Logger from '../services/logger';
import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import globby from 'globby';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, minishiftUrl, fileName, targetFolderName, minishiftSha256) {
    super(CDKInstall.KEY, 900, minishiftUrl, fileName, targetFolderName, installerDataSvc, true);

    this.sha256 = minishiftSha256;
    this.addOption('install', '3.0.0', '', true);
    this.selected = false;
  }

  static get KEY() {
    return 'cdk';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let minishiftDir = this.installerDataSvc.ocDir();
    let minishiftExe = path.join(minishiftDir, Platform.OS === 'win32' ? 'minishift.exe' : 'minishift');
    let installer = new Installer(CDKInstall.KEY, progress, success, failure);
    let ocExe;
    let ocExePattern = Platform.OS === 'win32' ? '/**/oc.exe' : '/**/oc';
    Promise.resolve().then(()=> {
      if(this.downloadedFile.endsWith('.exe') || path.parse(this.downloadedFile).ext == '') {
        return installer.copyFile(this.downloadedFile, minishiftExe);
      }
      return Promise.reject('Cannot process downloaded cdk distribution');
    }).then(()=> {
      return Platform.makeFileExecutable(minishiftExe);
    }).then(()=> {
      return installer.exec(`${minishiftExe} setup-cdk --force --default-vm-driver=virtualbox`, this.createEnvironment());
    }).then(()=> {
      return Platform.getUserHomePath();
    }).then((home)=> {
      return globby(ocExePattern, {root: path.join(home, '.minishift', 'cache', 'oc')});
    }).then((files)=> {
      ocExe = files[0].replace(/\//g, path.sep);
      return Promise.resolve();
    }).then(()=> {
      return Platform.makeFileExecutable(ocExe);
    }).then(()=> {
      return Platform.addToUserPath([ocExe, minishiftExe]);
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
    let newPath = [vboxInstall.getLocation()];
    let oldPath = Platform.ENV[Platform.PATH];

    if (Platform.OS === 'win32') {
      newPath.push(cygwinInstall.getLocation());
    }

    if(oldPath.trim()) {
      newPath.push(oldPath);
    }

    env[Platform.PATH] = newPath.join(path.delimiter);
    Logger.info(CDKInstall.KEY + ' - Set PATH environment variable to \'' + env[Platform.PATH] + '\'');
    return env;
  }

}

export default CDKInstall;
