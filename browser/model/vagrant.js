'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, targetFolderName, sha256) {
    super(VagrantInstall.KEY, 900, downloadUrl, installFile, targetFolderName, installerDataSvc, false);

    this.downloadedFileName = 'vagrant.msi';
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
    this.detected = false;
    this.minimumVersion = '1.8.1';
    this.existingVersion = '';
    this.sha256 = sha256;
  }

  static get KEY() {
    return 'vagrant';
  }

  detectExistingInstall(done = function() {}) {
    let versionRegex = /Vagrant*\s(\d+\.\d+\.\d+)/;
    let command;

    if (Platform.OS === 'win32') {
      command = 'where vagrant';
    } else {
      command = 'which vagrant';
    }

    let detectedPath = '';

    Util.executeCommand(command, 1).then((output) => {
      let lines = output.split('\n');
      if (lines.length == 1) {
        detectedPath = lines[0];
      } else {
        for(let line of lines) {
          if(line.endsWith('.exe')) {
            detectedPath = line;
            break;
          }
        }
      }
      return Util.executeCommand('"' + detectedPath + '"' + ' -v', 1);
    }).then((output) => {
      let version = versionRegex.exec(output)[1];
      this.addOption('detected', '', path.dirname(path.dirname(detectedPath)), false);
      this.option['detected'].version = version;
      this.selectedOption = 'detected';
      this.validateVersion();
      done();
    }).catch((error) => {
      let installLocation = Platform.identify({
        win32: ()=>path.join(this.installerDataSvc.installRoot, 'vagrant'),
        default: ()=>'/usr/local'
      });
      this.addOption('install', this.version, installLocation, true);
      done(error);
    });
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
      } else if(Version.GT(option.version, this.minimumVersion)) {
        option.valid = true;
        option.error = '';
        option.warning = 'newerVersion';
      }
    }
  }
}

class VagrantInstallWindows extends VagrantInstall {

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === 'install') {
      let installer = new Installer(VagrantInstall.KEY, progress, success, failure);
      installer.execFile('msiexec', [
        '/i',
        this.downloadedFile,
        'VAGRANTAPPDIR=' + this.installerDataSvc.vagrantDir(),
        '/qn',
        '/norestart',
        '/Liwe',
        path.join(this.installerDataSvc.installDir(), 'vagrant.log')
      ]).then((result) => {
        return installer.succeed(result);
      }).catch((error) => {
        if(error.code == 3010) {
          return installer.succeed(true);
        }
        return installer.fail(error);
      });
    } else {
      success();
    }
  }

  setup(progress, success, failure) {
    progress.setStatus('Setting up');
    let installer = new Installer(VagrantInstall.KEY, progress, success, failure);
    let data = [
      '$vagrantPath = "' + path.join(this.installerDataSvc.vagrantDir(), 'bin') + '"',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$vagrantPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');
    let args = [
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      this.vagrantPathScript
    ];
    installer.writeFile(this.vagrantPathScript, data)
    .then((result) => {
      return installer.execFile('powershell', args, result);
    }).then(() => {
      return installer.succeed(true);
    }).catch((result) => {
      return installer.fail(result);
    });
  }
}

class VagrantInstallDarwin extends VagrantInstall {

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === 'install') {
      let dmgFile = this.downloadedFile;
      //let timestamp = new Date().toJSON().replace(/:/g,'')
      let volumeName = 'vagrant-1.8.1';
      let shellScript = [
        `hdiutil attach -mountpoint /Volumes/${volumeName}  ${dmgFile}`,
        `installer -pkg /Volumes/${volumeName}/Vagrant.pkg -target /`
      ].join(';');
      let osaScript = [
        'osascript',
        '-e',
        `"do shell script \\\"${shellScript}\\\" with administrator privileges"`
      ].join(' ');

      let installer = new Installer(VagrantInstall.KEY, progress, success, failure);
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
  darwin: ()=>VagrantInstallDarwin,
  default: ()=>VagrantInstallWindows
});

export { VagrantInstall, VagrantInstallWindows, VagrantInstallDarwin };
