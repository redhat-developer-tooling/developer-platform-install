'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import globby from 'globby';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, $timeout, minishiftUrl, fileName, targetFolderName, minishiftSha256) {
    super(CDKInstall.KEY, 900, minishiftUrl, fileName, targetFolderName, installerDataSvc, true);

    this.$timeout = $timeout;
    this.minishiftSha256 = minishiftSha256;
    this.addOption('install', '2.0.0', '', true);
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
    let minishiftExe = path.join(minishiftDir,'minishift' + Platform.OS === 'win32' ? '.exe' : '');
    let ocDir;
    let ocExe;
    let installer = new Installer(CDKInstall.KEY, progress, success, failure);

    let markerContent = [
      'openshift.auth.scheme=Basic',
      'openshift.auth.username=openshift-dev',
      'openshift.auth.password=devel',
      'oc.binary.path=' + this.installerDataSvc.ocDir(),
      'minishift.binary.path=' + this.installerDataSvc.ocDir(),
      'rhel.iso.binary.path=' + this.installerDataSvc.cdkBoxDir(),
      'rhel.subscription.username=' + this.installerDataSvc.getUsername()
    ].join('\r\n');
    Promise.resolve().then(()=> {
      return Platform.getUserHomePath().then((home)=>{
        cdkDotFolder = path.join(home,".minishift")
        return Promise.resolve();
      });
    }).then(() => {
      if(this.downloadedFile.endsWith('.exe')) {
        return installer.copyFile(this.downloadedFile, minishiftDir);
      } else if(this.downloadedFile.endsWith('.zip') || this.downloadedFile.endsWith('.tar.gz') ) {
        return installer.unzip(this.downloadedFile, minishiftDir, Platform.OS === 'win32' ? '' :'darwin-amd64/')
      }
      return Promise.reject('Cannot process downloaded cdk distribution');
    }).then(() => {
      return Platform.OS === 'win32' ? Promise.resolve(true) : installer.exec(`chmod +x ${minishiftDir}/minishift`);
    }).then(() => {
      return installer.exec(`${minishiftDir}/minishift setup-cdk --default-vm-driver=virtualbox`);
    }).then(() => {
      return globby(['oc','oc.exe'],{root: cdkDotFolder}).then((files)=>{
        ocExe = files[0];
        ocDir = path.parse(ocExe).dir;
        return Promise.resolve();
      });
    }).then(()=> {
      return Platform.OS === 'win32' ? Promise.resolve(true) : installer.exec(`chmod +x ${ocExe}`);
    }).then(() => {
      return installer.writeFile(this.installerDataSvc.cdkMarker(), markerContent, result);
    }).then(() => {
      return Platform.OS === 'win32' ? Platform.addToUserPath([ocDir]) : Platform.addToUserPath([`${ocDir}/oc`,`${ocDir}/minishift`]);
    }).then((result) => {
      return installer.succeed(result);
    }).catch((error) => {
      return installer.fail(error);
    });
  }
}

export default CDKInstall;
