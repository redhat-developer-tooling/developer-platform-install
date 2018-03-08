'use strict';

import path from 'path';
import Logger from '../services/logger';
import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import globby from 'globby';
import fs from 'fs-extra';
import pify from 'pify';
import os from 'os';
import Util from './helpers/util';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(CDKInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'cdk';
  }

  get minishiftExe() {
    return path.join(this.ocDir(), Platform.OS === 'win32' ? 'minishift.exe' : 'minishift');
  }

  ocDir() {
    return path.join(this.getTargetLocation(), 'bin');
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);
    let ocExe;
    let ocExePattern = Platform.OS === 'win32' ? '/**/oc.exe' : '/**/oc';
    let home;
    let driverName = 'virtualbox';
    return Promise.resolve().then(()=> {
      if(this.downloadedFile.endsWith('.exe') || path.parse(this.downloadedFile).ext == '') {
        return installer.copyFile(this.downloadedFile, this.minishiftExe);
      }
      return Promise.reject('Cannot process downloaded cdk distribution');
    }).then(()=> {
      return Platform.makeFileExecutable(this.minishiftExe);
    }).then(()=> {
      let hv = this.installerDataSvc.getInstallable('hyperv');
      if (hv && hv.hasOption('detected')) {
        driverName = 'hyperv';
        return Platform.getHypervAdminsGroupName().then((group)=>{
          installer.exec(
            `net localgroup "${group}" "%USERDOMAIN%\\%USERNAME%" /add`
          ).catch(()=>{});
        }).then(() => {
          return Util.writeFile(path.join(os.tmpdir(), 'rd-devsuite-vswitch.ps1'), this.createHypervSwitch());
        }).then(() => {
          return installer.exec(`powershell -ExecutionPolicy Bypass -File ${path.join(os.tmpdir(), 'rd-devsuite-vswitch.ps1')}`);
        });
      }
    }).then(()=> {
      return installer.exec(
        'minishift stop', {env: this.createEnvironment()}
      ).catch(()=>{});
    }).then(()=> {
      return installer.exec(`minishift setup-cdk --force --default-vm-driver=${driverName}`, {env:this.createEnvironment()});
    }).then(()=> {
      return Platform.getUserHomePath();
    }).then((result)=> {
      home = Platform.ENV.MINISHIFT_HOME ? Platform.ENV.MINISHIFT_HOME : path.join(result, '.minishift');
      return globby(ocExePattern, {root: path.join(home, 'cache', 'oc')});
    }).then((files)=> {
      ocExe = files[0].replace(/\//g, path.sep);
    }).then(()=> {
      return Platform.makeFileExecutable(ocExe);
    }).then(()=> {
      return Platform.addToUserPath([this.minishiftExe]);
    }).then(() => {
      return Platform.addToUserPath([ocExe], 'User');
    }).then(()=> {
      return pify(fs.appendFile)(
        path.join(home, 'cdk'),
        `rhel.subscription.username=${this.installerDataSvc.username}`);
    }).then(()=> {
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
    });
  }

  createEnvironment() {
    let vboxInstall = this.installerDataSvc.getInstallable('virtualbox');
    let cygwinInstall = this.installerDataSvc.getInstallable('cygwin');
    let env = Object.assign({}, Platform.ENV);
    let newPath = [];
    let oldPath = Platform.ENV[Platform.PATH];

    if(cygwinInstall) {
      newPath.push(cygwinInstall.getLocation());
    }

    newPath.push(this.ocDir());

    if(vboxInstall) {
      newPath.push(vboxInstall.getLocation());
    }

    if(oldPath.trim()) {
      newPath.push(oldPath);
    }

    env[Platform.PATH] = newPath.join(path.delimiter);
    Logger.info(this.keyName + ' - Set PATH environment variable to \'' + env[Platform.PATH] + '\'');
    return env;
  }

  isConfigurationValid() {
    let cygwin = this.installerDataSvc.getInstallable('cygwin');
    return this.isConfigured()
      && this.virtualizationIsConfigured()
      && (!cygwin || cygwin.isConfigured())
      || this.isSkipped();
  }


  virtualizationIsConfigured() {
    let virtualbox = this.installerDataSvc.getInstallable('virtualbox');
    let hyperv = this.installerDataSvc.getInstallable('hyperv');
    return virtualbox && virtualbox.isConfigured()
      || (hyperv && hyperv.isConfigured() || this.selectedOption !== 'install');
  }

  createHypervSwitch() {
    let commands = [
      '$ErrorActionPreference = "Stop"',
      '$switchName = if ($env:HYPERV_VIRTUAL_SWITCH) {$env:HYPERV_VIRTUAL_SWITCH} else {"minishift-switch"}',
      'try { Get-VMSwitch -Name $switchName }',
      'catch { $adapterName;',
      '[array]$adapters = Get-NetAdapter -Physical | Where-Object { $_.status -eq "up" }',
      'foreach ($adapter in $adapters) {',
      '$adapterName = $adapter.Name',
      'if ($adapterName -like "ethernet*") { break } }',
      'New-VMSwitch -Name $switchName -NetAdapterName $adapterName',
      '[Environment]::SetEnvironmentVariable("HYPERV_VIRTUAL_SWITCH", $switchName, "User") }'
    ];
    return commands.join('\n');
  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new CDKInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

CDKInstall.convertor = {fromJson};

export default CDKInstall;
