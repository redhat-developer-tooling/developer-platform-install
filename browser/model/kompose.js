'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Platform from '../services/platform';

class KomposeInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, version, downloadUrl, fileName, sha256) {
    super(KomposeInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, false);
    this.addOption('install', this.version, '', true);
    this.sha256 = sha256;
  }

  static get KEY() {
    return 'kompose';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let komposeDir = this.installerDataSvc.komposeDir();
    let installer = new Installer(KomposeInstall.KEY, progress, success, failure);
    let komposeExe = path.join(komposeDir, Platform.OS === 'win32' ? 'kompose.exe' : 'kompose');
    return Promise.resolve().then(()=> {
      if(this.downloadedFile.endsWith('.exe') || path.parse(this.downloadedFile).ext == '') {
        return installer.copyFile(this.downloadedFile, komposeExe);
      }
    }).then(()=> {
      return Platform.makeFileExecutable(komposeExe);
    }).then(()=> {
      return Platform.addToUserPath([komposeExe]);
    }).then(()=> {
      installer.success(true);
    }).catch((error)=> {
      installer.fail(error);
    });
  }
}

export default KomposeInstall;
