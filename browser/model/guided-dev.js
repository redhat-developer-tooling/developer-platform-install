'use strict';

import path from 'path';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Utils from './helpers/util';
import Platform from '../services/platform';
import fs from 'fs-extra';
import pify from 'pify';

class EclipseGuidedDevInstall extends InstallableItem {
  constructor(keyName, installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, congratulation, ref) {
    super(keyName, downloadUrl, fileName, targetFolderName, installerDataSvc, false);
    this.addOption('install', this.version, '', false);
    this.sha256 = sha256sum;
    this.congratulation = congratulation;
    this.refs = ref;
  }

  getDefaultCsContent() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<compositeCheatsheet name="Red Hat Development Suite">
   <taskGroup kind="set" name="${this.productName}" skip="false">
      <intro>
         ${this.productDesc}
      </intro>
      <onCompletion>
         ${this.congratulation}
      </onCompletion>
      <!-- tasks -->
   </taskGroup>
</compositeCheatsheet>`;
  }

  getTaskContent(file) {
    return `
<task kind="cheatsheet" name="${file.taskName}" skip="false">
   <intro>
      ${file.intro}
   </intro>
   <onCompletion>
      ${file.onCompletion}
   </onCompletion>
   ${this.getParamContents(file)}
</task>`;
  }

  getParamContents(item) {
    return item.id ? `
      <param name="id" value="${item.id}">
      </param>` : `
      <param name="path" value="${item.fileName}">
      </param>`;
  }

  getTasksContents() {
    let contents = '';
    for (let file in this.files) {
      contents += this.getTaskContent(this.files[file]);
    }
    for (let id in this.refs) {
      contents += this.getTaskContent(this.refs[id]);
    }
    return contents + '\n<!-- tasks -->';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let devstudioDir = this.installerDataSvc.devstudioDir();
    let csDir = path.join(devstudioDir,'cheatsheets');
    let csLocation = path.join(csDir, 'guided-development.xml');
    return Promise.resolve().then(()=> {
      if(EclipseGuidedDevInstall.firstCall && fs.existsSync(csDir)) {
        //delete cheatsheets xml if exists
        fs.removeSync(csDir);
      }
      EclipseGuidedDevInstall.firstCall = false;
      if(!fs.existsSync(csDir)) {
        fs.ensureDirSync(csDir);
      }
      if(!fs.existsSync(csLocation)) {
        return Utils.writeFile(csLocation, this.getDefaultCsContent());
      }
    }).then(()=> {
      return Utils.replaceInFile({
        files: csLocation,
        from: '<!-- tasks -->',
        to: this.getTasksContents()
      });
    }).then(()=> {
      for (let file in this.files) {
        fs.copySync(
          path.resolve(__dirname, '..', '..', 'cheatsheets', this.files[file].fileName),
          path.join(csDir, this.files[file].fileName));
      }
    }).then(()=> {
      success(true);
    }).catch((error)=> {
      progress.setStatus('Failed');
      failure(error);
    });
  }
}

function fromJson({keyName, installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, congratulation, ref}) {
  return new EclipseGuidedDevInstall(keyName, installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, congratulation, ref);
}

EclipseGuidedDevInstall.convertor = {fromJson};
EclipseGuidedDevInstall.firstCall = true;

export default EclipseGuidedDevInstall;
