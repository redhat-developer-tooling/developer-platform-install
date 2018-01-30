'use strict';

import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
let fs = require('fs');
let fse = require('fs-extra');
let path = require('path');
let unzip = require('unzip-stream');
let mkdirp = require('mkdirp');

class FusePlatformInstallKaraf extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(FusePlatformInstallKaraf.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'fuseplatformkaraf';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);
    return new Promise((resolve, reject)=> {
      fs.createReadStream(this.downloadedFile).pipe(unzip.Parse())
        .on('entry', (entry)=> {
          try {
            var fileName = entry.path;
            let f = fileName.substring(fileName.indexOf('/')+1);
            let dest = path.join(this.installerDataSvc.fuseplatformkarafDir(), ...f.split('/'));
            if (entry.type === 'File') {
              entry.pipe(fs.createWriteStream(dest));
            } else {
              mkdirp.sync(dest);
              entry.autodrain();
            }
          } catch(err) {
            reject(err);
          }
        }).on('error', function (error) {
          reject(error);
        }).on('close', ()=> {
          resolve();
        });
    }).then(()=> {
      let users = path.join(this.installerDataSvc.fuseplatformkarafDir(), 'etc', 'users.properties');
      let result;
      if(fse.existsSync(users)) {
        const user = 'admin=admin,admin,manager,viewer,Monitor, Operator, Maintainer, Deployer, Auditor, Administrator, SuperUser';
        result = fse.appendFile(users, user).catch((error)=>{
          Logger.error(this.keyName + ' - error occured during admin password configuration');
          Logger.error(this.keyName + ` - ${error}`);
        });
      }
      return result;
    }).then(()=> {
      this.ipcRenderer.on('installComplete', (event, arg)=> {
        if(arg == 'all') {
          let devstudio = this.installerDataSvc.getInstallable('devstudio');
          if(devstudio.installed) {
            devstudio.configureRuntimeDetection('fuse-platform-on-karaf', this.installerDataSvc.fuseplatformkarafDir());
          }
        }
      });
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
      return Promise.reject(error);
    });
  }

  isConfigurationValid() {
    let jdk = this.installerDataSvc.getInstallable('jdk');
    return jdk.isConfigured()
      && this.isConfigured()
      || this.isSkipped();
  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new FusePlatformInstallKaraf(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

FusePlatformInstallKaraf.convertor = {fromJson};

export default FusePlatformInstallKaraf;
