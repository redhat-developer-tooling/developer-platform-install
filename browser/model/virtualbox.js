'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';
import del from 'del';

class VirtualBoxInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256, version, revision) {
    super(VirtualBoxInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, false);

    this.minimumVersion = version;
    this.maximumVersion = '5.2.0';
    this.revision = revision;

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.sha256 = sha256;
    this.addOption('install', this.version, '', true);
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
    let tempDetectedLocation = '';
    return Util.executeCommand(
      'echo %VBOX_INSTALL_PATH%', 1
    ).then((output) => {
      return new Promise((resolve) => {
        if (output === '%VBOX_INSTALL_PATH%') {
          Util.executeCommand('echo %VBOX_MSI_INSTALL_PATH%', 1).then(resolve);
        } else {
          resolve(output);
        }
      });
    }).then((output) => {
      if(output === '%VBOX_MSI_INSTALL_PATH%') {
        return Util.executeCommand('where VirtualBox', 1);
      }
      return Promise.resolve(output);
    }).then((output) => {
      tempDetectedLocation = output;
      return Promise.resolve(output);
    }).then((output) => {
      return Util.folderContains(output, ['VirtualBox.exe', 'VBoxManage.exe']);
    }).then((output) => {
      var command = '"' + path.join(output, 'VBoxManage.exe') + '"' + ' --version';
      return Util.executeCommand(command, 1);
    }).then((output) => {
      let version = /(\d+\.\d+\.\d+)r\d+/.exec(output)[1];
      this.addOption('detected', version, tempDetectedLocation, Version.GE(version, this.minimumVersion));
      this.selectedOption = 'detected';
      this.validateVersion();
    }).catch(() => {
      if(this.option.detected) {
        delete this.option.detected;
      }
      this.addOption('install', this.version, path.join(this.installerDataSvc.installRoot, 'virtualbox'), true);
      this.selectedOption = 'install';
      return Promise.resolve();
    }).then(()=>{
      return Platform.isVirtualizationEnabled();
    }).then((result)=>{
      this.virtualizationEnabled=result;
      return Promise.resolve();
    });
  }

  isConfigured() {
    return super.isConfigured() && (this.virtualizationEnabled || this.virtualizationEnabled == undefined) ||  (this.selectedOption == 'detected' && !this.hasOption('detected'));
  }

  isSkipped() {
    let hyperv = this.installerDataSvc.getInstallable('hyperv');
    return hyperv && hyperv.isConfigured() || super.isSkipped();
  }

  installAfterRequirements(progress, success, failure) {
    let installer = new Installer(VirtualBoxInstall.KEY, progress, success, failure);
    return installer.execFile(
      this.downloadedFile, ['--extract', '-path', this.installerDataSvc.virtualBoxDir(), '--silent']
    ).then(() => {
      return this.configure(installer);
    }).then(() => {
      Platform.addToUserPath([this.option['install'].location]);
      installer.succeed(true);
    }).catch((error) => {
      installer.fail(error);
    });
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
    let msiFile = path.join(this.installerDataSvc.virtualBoxDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
    return installer.execFile('msiexec', [
      '/i',
      msiFile,
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
    }).then(()=>{
      del(['*.msi', '*.cab'], {cwd: this.installerDataSvc.virtualBoxDir()});
    });
  }
}

class VirtualBoxInstallDarwin extends VirtualBoxInstall {

  detectExistingInstall() {
    let tempDetectedLocation = '';
    return Util.executeCommand('which virtualbox', 1).then((output) => {
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
    }).catch(() => {
      if(this.option.detected) {
        delete this.option.detected;
      }
      this.addOption('install', this.version, '/usr/local/bin', true);
      this.selectedOption = 'install';
      return Promise.resolve();
    }).then(() => {
      return Platform.isVirtualizationEnabled();
    }).then((result) => {
      this.virtualizationEnabled=result;
    });
  }

  isConfigured() {
    return super.isConfigured() && (this.virtualizationEnabled || this.virtualizationEnabled == undefined);
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(VirtualBoxInstall.KEY, progress, success, failure);
    return installer.exec(this.getScript()).then((result) => {
      installer.succeed(result);
    }).catch((error) => {
      installer.fail(error);
    });
  }

  getScript() {
    let dmgFile = this.downloadedFile;
    //let timestamp = new Date().toJSON().replace(/:/g,'')
    let volumeName = `virtualbox-${this.version}`;
    let shellScript = [
      `hdiutil attach -mountpoint /Volumes/${volumeName}  ${dmgFile}`,
      `installer -pkg /Volumes/${volumeName}/VirtualBox.pkg -target /`
    ].join(';');
    let osaScript = [
      'osascript',
      '-e',
      `"do shell script \\\"${shellScript}\\\" with administrator privileges"`
    ].join(' ');
    return osaScript;
  }
}



export default Platform.identify({
  darwin: ()=>VirtualBoxInstallDarwin,
  default: ()=>VirtualBoxInstallWindows
});

export { VirtualBoxInstall, VirtualBoxInstallWindows, VirtualBoxInstallDarwin };
