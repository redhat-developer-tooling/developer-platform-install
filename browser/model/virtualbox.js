'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installerDataSvc, downloadUrl, fileName, targetFolderName, sha256) {
    super(VirtualBoxInstall.KEY, 700, downloadUrl, fileName, targetFolderName, installerDataSvc, false);

    this.minimumVersion = version;
    this.maximumVersion = '5.2.0';
    this.revision = revision;

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.installerDataSvc.tempDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
    this.sha256 = sha256;
  }

  static get KEY() {
    return 'virtualbox';
  }

  validateVersion() {
    let option = this.option[this.selectedOption];
    if(option) {
      option.valid = true;
      option.error = '';
      option.warning = '';
      if(Version.LT(option.version, this.minimumVersion)) {
        option.valid = false;
        option.error = 'oldVersion';
        option.warning = '';
      } else if(Version.GT(option.version, this.minimumVersion) && Version.LT(option.version, this.maximumVersion)) {
        option.valid = true;
        option.error = '';
        option.warning = 'newerVersion';
      } else if(Version.GE(option.version, this.maximumVersion)) {
        option.valid = false;
        option.error = '';
        option.warning = 'newerVersion';
      }
    }
  }
}

class VirtualBoxInstallWindows extends VirtualBoxInstall {

  detectExistingInstall() {
    return new Promise((resolve)=> {
      let versionRegex = /(\d+\.\d+\.\d+)r\d+/;
      let command;
      let extension = '';

      if (Platform.OS === 'win32') {
        command = 'echo %VBOX_INSTALL_PATH%';
        extension = '.exe';
      } else {
        command = 'which virtualbox';
      }

      let tempDetectedLocation = '';
      Util.executeCommand(command, 1).then((output) => {
        return new Promise((resolve) => {
          if (Platform.OS === 'win32') {
            if (output === '%VBOX_INSTALL_PATH%') {
              return Util.executeCommand('echo %VBOX_MSI_INSTALL_PATH%', 1).then((output)=>{
                resolve(output);
              });
            } else {
              resolve(output);
            }
          } else {
            return Util.findText(output, 'INSTALL_DIR=').then((result) => {
              resolve(result.split('=')[1]);
            }).catch(()=>{
              resolve(path.parse(output).dir);
            });
          }
        });
      }).then((output) => {
        // with VBox 5.0.8 or later installed in C:\Program Files\Oracle\VirtualBox, output = C:\Program Files\Oracle\VirtualBox
        if(output === '%VBOX_MSI_INSTALL_PATH%') {
          return Util.executeCommand('where VirtualBox', 1);
        }
        // this ensures that by default the previous install is selected for reuse
        // to detect previous install, but NOT use the existing install, `return resolve(output);` here instead
        return Promise.resolve(output);
      }).then((output) => {
        tempDetectedLocation = output;
        return Promise.resolve(output);
      }).then((output) => {
        return Util.folderContains(output, ['VirtualBox' + extension, 'VBoxManage' + extension]);
      }).then((output) => {
        var command = '"' + path.join(output, 'VBoxManage' + extension) +'"' + ' --version';
        return Util.executeCommand(command, 1);
      }).then((output) => {
        let version = versionRegex.exec(output)[1];
        this.addOption('detected', version, tempDetectedLocation, Version.GE(version, this.minimumVersion));
        this.selectedOption = 'detected';
        this.validateVersion();
        resolve();
      }).catch(() => {
        this.addOption('install', this.version, path.join(this.installerDataSvc.installRoot, 'virtualbox'), true);
        this.addOption('different', '', '', false);
        resolve();
      });
    });
  }

  installAfterRequirements(progress, success, failure) {
    let installer = new Installer(VirtualBoxInstall.KEY, progress, success, failure);
    if(this.selectedOption === 'install') {
      installer.execFile(
        this.downloadedFile, ['--extract', '-path', this.installerDataSvc.tempDir(), '--silent']
      ).then(() => {
        return this.configure(installer);
      }).then((result) => {
        Platform.addToUserPath([this.option['install'].location]);
        installer.succeed(result);
      }).catch((error) => {
        installer.fail(error);
      });
    } else {
      success();
    }
  }

  configure(installer) {
    return new Promise((resolve, reject) => {
      // If downloading is not finished wait for event
      if (this.installerDataSvc.downloading) {
        Logger.info(VirtualBoxInstall.KEY + ' - Waiting for all downloads to complete');
        installer.progress.setStatus('Waiting for all downloads to finish');
        this.ipcRenderer.on('downloadingComplete', () => {
          // time to start virtualbox installer
          return this.installMsi(installer, resolve, reject);
        });
      } else { // it is safe to call virtualbox installer
        //downloading is already over vbox install is safe to start
        return this.installMsi(installer, resolve, reject);
      }
    });
  }

  installMsi(installer, resolve, reject) {
    installer.progress.setStatus('Installing');
    return installer.execFile('msiexec', [
      '/i',
      this.msiFile,
      'INSTALLDIR=' + this.installerDataSvc.virtualBoxDir(),
      'ADDLOCAL=VBoxApplication,VBoxNetwork,VBoxNetworkAdp',
      '/qn',
      '/norestart',
      '/Liwe',
      path.join(this.installerDataSvc.installDir(), 'vbox.log')
    ]).then((res) => {
      // msiexec logs are in UCS-2
      Util.findText(path.join(this.installerDataSvc.installDir(), 'vbox.log'), 'CopyDir: DestDir=', 'ucs2').then((result)=>{
        let regexTargetDir = /CopyDir: DestDir=(.*)\,.*/;
        let targetDir = regexTargetDir.exec(result)[1];
        if(targetDir !== this.getLocation()) {
          Logger.info(VirtualBoxInstall.KEY + ' - virtual box location not detected, but it is installed into ' + targetDir + ' according info in log file');
          this.setOptionLocation('install', targetDir);
        }
        resolve(res);
      }).catch(()=>{
        // location doesn't parsed correctly, nothing to verify just resolve and keep going
        resolve(res);
      });
    }).catch((err) => {
      return reject(err);
    });
  }
}

class VirtualBoxInstallDarwin extends VirtualBoxInstall {

  detectExistingInstall() {
    return new Promise((resolve, reject)=> {
      let tempDetectedLocation = '';
      Util.executeCommand('which virtualbox', 1).then((output) => {
        return new Promise((resolve) => {
          return Util.findText(output, 'INSTALL_DIR=').then((result) => {
            return resolve(result.split('=')[1]);
          }).catch(()=>{
            return resolve(path.parse(output).dir);
          });
        });
      }).then((output) => {
        return Util.folderContains(output, ['VirtualBox', 'VBoxManage']);
      }).then((output) => {
        tempDetectedLocation = output;
        var command = '"' + path.join(output, 'VBoxManage') +'"' + ' --version';
        return Util.executeCommand(command, 1);
      }).then((output) => {
        let versionRegex = /(\d+\.\d+\.\d+)r\d+/;
        let version = versionRegex.exec(output)[1];
        this.addOption('detected', version, tempDetectedLocation, Version.GE(version, this.minimumVersion));
        this.selectedOption = 'detected';
        this.validateVersion();
        resolve();
      }).catch(() => {
        this.addOption('install', this.version, '/usr/local/bin', true);
        reject();
      });
    });
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === 'install') {
      let dmgFile = this.downloadedFile;
      //let timestamp = new Date().toJSON().replace(/:/g,'')
      let volumeName = 'virtualbox-5.0.26';
      let shellScript = [
        `hdiutil attach -mountpoint /Volumes/${volumeName}  ${dmgFile}`,
        `installer -pkg /Volumes/${volumeName}/VirtualBox.pkg -target /`
      ].join(';');
      let osaScript = [
        'osascript',
        '-e',
        `"do shell script \\\"${shellScript}\\\" with administrator privileges"`
      ].join(' ');

      let installer = new Installer(VirtualBoxInstall.KEY, progress, success, failure);
      installer.exec(osaScript).then((result) => {
        return installer.succeed(result);
      }).catch((error) => {
        return installer.fail(error);
      });
    } else {
      success();
    }
  }

}

export default Platform.identify({
  darwin: ()=>VirtualBoxInstallDarwin,
  default: ()=>VirtualBoxInstallWindows
});

export { VirtualBoxInstall, VirtualBoxInstallWindows, VirtualBoxInstallDarwin };
