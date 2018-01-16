'use strict';

import path from 'path';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Platform from '../services/platform';
import CDKInstall from './cdk';

class CheInstall extends InstallableItem {
  constructor(installerDataSvc, url) {
    super(CheInstall.KEY, url, '', '', installerDataSvc, false);
    this.addOption('install', this.version, '', false);
  }

  static get KEY() {
    return 'cdkcheaddon';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);
    return Promise.resolve().then(()=>{
      return installer.exec('minishift config set memory 5GB && minishift addon enable che', { env: this.createEnvironment() });
    }).then(success).catch((error) => {
      installer.fail(error);
    });
  }

  createEnvironment() {
    let env = this.cdkInstaller.createEnvironment();
    let newPath = [this.cdkInstaller.getLocation(), env[Platform.PATH]];
    env[Platform.PATH] = newPath.join(path.delimiter);
    return env;
  }

  get cdkInstaller() {
    return this.installerDataSvc.getInstallable(CDKInstall.KEY);
  }
}

function fromJson({installerDataSvc, url}) {
  return new CheInstall(installerDataSvc, url);
}

CheInstall.convertor = {fromJson};

export default CheInstall;
