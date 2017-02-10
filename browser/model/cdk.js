'use strict';

import path from 'path';
import fs from 'fs-extra';
import rimraf from 'rimraf';

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import globby from 'globby';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, $timeout, minishiftUrl, fileName, targetFolderName, minishiftSha256) {
    super(CDKInstall.KEY, 900, minishiftUrl, fileName, targetFolderName, installerDataSvc, true);

    this.$timeout = $timeout;
    this.sha256 = minishiftSha256;
    this.addOption('install', '3.0.0', '', true);
    this.selected = false;
  }

  static get KEY() {
    return 'cdk';
  }

  detectExistingInstall(cb = function() {}) {
    cb();
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let cdkDotFolder;
    let minishiftDir = this.installerDataSvc.ocDir();
    let minishiftExe = path.join(minishiftDir, 'minishift' + (Platform.OS === 'win32' ? '.exe' : ''));
    let ocDir;
    let ocExe;
    let installer = new Installer(CDKInstall.KEY, progress, success, failure);

    Promise.resolve().then(()=> {
      return Platform.getUserHomePath().then((home)=>{
        cdkDotFolder = path.join(home, '.minishift');
        if(fs.existsSync(cdkDotFolder)) {
          rimraf.sync(cdkDotFolder);
        }
        return Promise.resolve();
      });
    }).then(() => {
      if(this.downloadedFile.endsWith('.exe') || path.parse(this.downloadedFile).ext == '') {
        return installer.copyFile(this.downloadedFile, minishiftExe);
      } else if(this.downloadedFile.endsWith('.zip') || this.downloadedFile.endsWith('.tar.gz') ) {
        return installer.unzip(this.downloadedFile, minishiftDir, Platform.OS === 'win32' ? '' :'darwin-amd64/');
      }
      return Promise.reject('Cannot process downloaded cdk distribution');
    }).then(() => {
      return Platform.OS === 'win32' ? Promise.resolve() : installer.exec(`chmod +x ${minishiftDir}/minishift`);
    }).then(() => {
      return installer.exec(`${minishiftExe} setup-cdk --default-vm-driver=virtualbox`);
    }).then(() => {
      return globby(['/**/oc', '/**/oc.exe'], {root: path.join(cdkDotFolder, 'cache', 'oc')}).then((files)=>{
        ocExe = files[0].replace(/\//g, path.sep);
        ocDir = path.parse(ocExe).dir;
        return Promise.resolve();
      });
    }).then(()=> {
      return Platform.OS === 'win32' ? Promise.resolve() : installer.exec(`chmod +x ${ocExe}`);
    }).then(() => {
      return installer.writeFile(this.installerDataSvc.cdkMarker(), this.generateMarkerFileContent(ocDir, minishiftDir, this.installerDataSvc.getUsername()));
    }).then(() => {
      return Platform.OS === 'win32' ? Platform.addToUserPath([minishiftDir, ocDir]) : Platform.addToUserPath([`${ocDir}/oc`, `${ocDir}/minishift`]);
    }).then(() => {
      installer.succeed(true);
    }).catch((error) => {
      installer.fail(error);
    });
  }

  generateMarkerFileContent(ocDir, minishiftDir, userName) {
    return [
      'openshift.auth.scheme=Basic',
      'openshift.auth.username=openshift-dev',
      'openshift.auth.password=devel',
      `oc.binary.path=${ocDir}`,
      `minishift.binary.path=${minishiftDir}`,
      `rhel.subscription.username=${userName}`
    ].join('\r\n');
  }
}

export default CDKInstall;
