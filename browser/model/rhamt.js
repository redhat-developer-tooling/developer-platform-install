'use strict';

let path = require('path');

import Util from './helpers/util';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Platform from '../services/platform';

class RhamtInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(RhamtInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.addOption('install', this.version, '', true);
    this.sha256 = sha256sum;
  }

  static get KEY() {
    return 'rhamtcli';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);
    let command = 'java -XshowSettings';
    let rhamtBinFile = path.join(this.installerDataSvc.rhamtDir(), 'bin', 'rhamt-cli');
    return installer.unzip(this.downloadedFile, this.installerDataSvc.rhamtDir()).then(()=>{
      return Platform.makeFileExecutable(rhamtBinFile);
    }).then(()=>{
      return Util.executeCommand(command, 2);
    }).then((output)=>{
      let locationRegex = /java\.home*\s=*\s(.*)[\s\S]/;
      var t = locationRegex.exec(output);
      if (t && t.length > 1) {
        return t[1];
      } else {
        return path.join(this.installerDataSvc.jdkDir(), 'jre');
      }
    }).then((output)=> {
      if (Platform.OS === 'win32') {
        return installer.exec(`setx /M JAVA_HOME "${output}"`);
      }
    }).then(()=> {
      return Platform.addToUserPath([rhamtBinFile]);
    }).then(()=> {
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
      return Promise.reject(error);
    });
  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new RhamtInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

RhamtInstall.convertor = {fromJson};

export default RhamtInstall;
