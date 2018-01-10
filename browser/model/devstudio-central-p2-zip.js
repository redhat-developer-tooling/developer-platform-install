'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Util from './helpers/util';


class DevStudioCentralP2Install extends InstallableItem {
  constructor(keyName, installerDataSvc, downloadUrl, fileName, sha256sum, ius) {
    super(keyName, downloadUrl, fileName, '', installerDataSvc, true);
    this.ius = ius;
    this.sha256 = sha256sum;
  }

  static get KEY() {
    return 'devstudiocentralp2zip';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    return Promise.resolve().then(()=> {
      let devstudio = this.installerDataSvc.getInstallable('devstudio');
      let devstudiocentral = this.installerDataSvc.getInstallable('devstudiocentral');
      let devstudioLocation = Platform.OS == 'darwin' ? 'studio/devstudio.app/Contents/MacOS' : 'studio';
      let devstudioExec = path.join(`${this.installerDataSvc.devstudioDir()}`, devstudioLocation, 'devstudio');
      let cmd = [`"${devstudioExec}"`,
        '-nosplash',
        '-application org.eclipse.equinox.p2.director',
        `-repository "jar:file:///${devstudiocentral.downloadedFile.replace(/\\/g, '/')}!/,jar:file:///${devstudio.downloadedFile.replace(/\\/g, '/')}!/devstudio"`,
        `-installIU ${this.ius.join(',')}`].join(' ');
      return Util.executeCommand(cmd);
    }).then(()=>{
      success();
    }).catch((error)=> {
      progress.setStatus('Failed');
      failure(error);
    });
  }

}

function fromJson({keyName, installerDataSvc, downloadUrl, fileName, sha256sum, ius}) {
  return new DevStudioCentralP2Install(keyName, installerDataSvc, downloadUrl, fileName, sha256sum, ius);
}

DevStudioCentralP2Install.convertor = {fromJson};

export default DevStudioCentralP2Install;
