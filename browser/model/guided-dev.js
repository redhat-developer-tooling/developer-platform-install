'use strict';

import path from 'path';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Utils from './helpers/util';
import Platform from '../services/platform';
import fs from 'fs-extra';

class EclipseGuidedDevInstall extends InstallableItem {
  constructor(keyName, installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, congratulation, csID) {
    super(keyName, downloadUrl, fileName, targetFolderName, installerDataSvc, false);
    this.addOption('install', this.version, '', false);
    this.sha256 = sha256sum;
    this.congratulation = congratulation;
    this.csID = csID;
  }

  getDefaultCsContent() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<compositeCheatsheet name="Red Hat Development Suite">
   <taskGroup kind="set" name="Guided Development" skip="false">
      <intro>
         This is the list of tasks you requested in Development Suite Installer
      </intro>
      <onCompletion>
         Congratulation! You just finished all your guided development courses!
      </onCompletion>
      <!-- tasks -->
   </taskGroup>
</compositeCheatsheet>`;
  }

  getTaskContents() {
    return `<task kind="cheatsheet" name="${this.productName}" skip="false">
   <intro>
      ${this.productDesc}
   </intro>
   <onCompletion>
      ${this.congratulation}
   </onCompletion>
   <param name="id" value="${this.csID}">
   </param>
</task>
<!-- tasks -->`;
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let devstudioDir = this.installerDataSvc.devstudioDir();
    let csDir = path.join(devstudioDir,'cheatsheets');
    let csLocation = path.join(csDir, 'guided-development.xml');
    return Promise.resolve().then(()=> {
      if(EclipseGuidedDevInstall.firstCall && fs.existsSync(csDir)) {
        //delete cheatsheets xml if exists
        fs.rmdirSync(csDir);
      }
      EclipseGuidedDevInstall.firstCall = false;
      if(!fs.existsSync(csDir)) {
        fs.mkdirSync(csDir);
      }
      if(!fs.existsSync(csLocation)) {
        return Utils.writeFile(csLocation, this.getDefaultCsContent());
      }
    }).then(()=> {
      return Utils.replaceInFile({
        files: csLocation,
        from: '<!-- tasks -->',
        to: this.getTaskContents()
      });
    }).then(()=> {
      success(true);
    }).catch((error)=> {
      progress.setStatus('Failed');
      failure(error);
    });
  }

}

function fromJson({keyName, installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, congratulation, csID}) {
  return new EclipseGuidedDevInstall(keyName, installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, congratulation, csID);
}

EclipseGuidedDevInstall.convertor = {fromJson};
EclipseGuidedDevInstall.firstCall = true;

export default EclipseGuidedDevInstall;
