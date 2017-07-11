'use strict';

import InstallableItem from './installable-item';

class FusePlatformInstallKaraf extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(FusePlatformInstallKaraf.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, false);
    this.sha256 = sha256sum;
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'fuseplatformkaraf';
  }

  installAfterRequirements(progress, success, failure) {

  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new FusePlatformInstallKaraf(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

FusePlatformInstallKaraf.convertor = {fromJson};

export default FusePlatformInstallKaraf;
