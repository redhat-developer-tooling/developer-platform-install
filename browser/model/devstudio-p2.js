'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Util from './helpers/util';


class DevStudioP2Install extends InstallableItem {
  constructor(keyName, installerDataSvc, p2RepoUrl, ius) {
    super(keyName, p2RepoUrl, '', '', installerDataSvc, false);
    this.ius = ius;
  }

  static get KEY() {
    return 'devstudiop2';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    return Promise.resolve().then(()=> {
      let devstudioLocation = Platform.OS == 'darwin' ? 'studio/devstudio.app/Contents/MacOS' : 'studio';
      let devstudioExec = path.join(`${this.installerDataSvc.devstudioDir()}`, devstudioLocation, 'devstudio');
      let cmd = [`"${devstudioExec}"`,
        '-nosplash',
        '-application org.eclipse.equinox.p2.director',
        `-repository ${this.downloadUrl}`,
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

function fromJson({keyName, installerDataSvc, downloadUrl, ius}) {
  return new DevStudioP2Install(keyName, installerDataSvc, downloadUrl, ius);
}

DevStudioP2Install.convertor = {fromJson};

export default DevStudioP2Install;
