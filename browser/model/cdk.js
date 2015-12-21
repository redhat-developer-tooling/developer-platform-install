'use strict';

let fs = require('fs-extra');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import VagrantInstall from './vagrant';
import Installer from './helpers/installer';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, $timeout, cdkUrl, cdkBoxUrl, ocUrl, vagrantFileUrl, pscpUrl, installFile) {
    super('CDK', 900, cdkUrl, installFile);

    this.installerDataSvc = installerDataSvc;
    this.$timeout = $timeout;
    this.cdkBoxUrl = cdkBoxUrl;
    this.ocUrl = ocUrl;
    this.vagrantFileUrl = vagrantFileUrl;
    this.pscpUrl = pscpUrl;

    this.boxName = 'rhel-cdk-kubernetes-7.2-6.x86_64.vagrant-virtualbox.box';

    this.cdkDownloadedFile = path.join(this.installerDataSvc.tempDir(), 'cdk.zip');
    this.cdkBoxDownloadedFile = path.join(this.installerDataSvc.tempDir(), this.boxName);
    this.ocDownloadedFile = path.join(this.installerDataSvc.tempDir(), 'oc.zip');
    this.vagrantDownloadedFile = path.join(this.installerDataSvc.tempDir(), 'vagrantfile.zip');
    this.pscpDownloadedFile = path.join(this.installerDataSvc.tempDir(), 'pscp.exe');
    this.pscpPathScript = path.join(this.installerDataSvc.tempDir(), 'set-pscp-path.ps1');
  }

  static key() {
    return 'cdk';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    let cdkBoxWriteStream = fs.createWriteStream(this.cdkBoxDownloadedFile);
    let cdkWriteStream = fs.createWriteStream(this.cdkDownloadedFile);
    let ocWriteStream = fs.createWriteStream(this.ocDownloadedFile);
    let vagrantFileWriteStream = fs.createWriteStream(this.vagrantDownloadedFile);
    let pscpWriteStream = fs.createWriteStream(this.pscpDownloadedFile);
    let downloadSize = 869598013;
    let totalDownloads = 5;

    let downloader = new Downloader(progress, success, failure, downloadSize, totalDownloads);
    let username = this.installerDataSvc.getUsername(),
        password = this.installerDataSvc.getPassword();

    downloader.setWriteStream(cdkBoxWriteStream);
    downloader.download(this.cdkBoxUrl);
    // TODO Switch back to auth download when CDK latest is in Customer Portal
    // downloader.downloadAuth
    //   ({
    //     url: this.cdkBoxUrl,
    //     rejectUnauthorized: false
    //   }, username, password);

    downloader.setWriteStream(cdkWriteStream);
    downloader.downloadAuth
      ({
        url: this.getDownloadUrl(),
        rejectUnauthorized: false
      }, username, password);

    downloader.setWriteStream(ocWriteStream);
    downloader.download(this.ocUrl);

    downloader.setWriteStream(vagrantFileWriteStream);
    downloader.download(this.vagrantFileUrl);

    downloader.setWriteStream(pscpWriteStream);
    downloader.download(this.pscpUrl);
  }

  install(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(CDKInstall.key(), progress, success, failure);

    let opts = [
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      this.pscpPathScript
    ];
    let data = [
      '$newPath = "' + this.installerDataSvc.ocDir() + '";',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$newPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');
    let markerContent = [
      'openshift.auth.scheme=Basic',
      'openshift.auth.username=test-admin',
      'vagrant.binary.path=' + path.join(this.installerDataSvc.vagrantDir(), 'bin'),
      'oc.binary.path=' + this.installerDataSvc.ocDir(),
      'rhel.subscription.username=' + this.installerDataSvc.getUsername()
    ].join('\r\n');

    installer.unzip(this.cdkDownloadedFile, this.installerDataSvc.installDir())
    .then((result) => { return installer.unzip(this.ocDownloadedFile, this.installerDataSvc.ocDir(), result); })
    .then((result) => { return installer.unzip(this.vagrantDownloadedFile, this.installerDataSvc.tempDir(), result); })
    .then((result) => { return installer.moveFile(path.join(this.installerDataSvc.tempDir(), 'openshift-vagrant-master', 'cdk-v2'), this.installerDataSvc.cdkVagrantfileDir(), result); })
    .then((result) => { return installer.moveFile(this.cdkBoxDownloadedFile, path.join(this.installerDataSvc.cdkBoxDir(), this.boxName), result); })
    .then((result) => { return installer.moveFile(this.pscpDownloadedFile, path.join(this.installerDataSvc.ocDir(), 'pscp.exe'), result); })
    .then((result) => { return installer.writeFile(this.pscpPathScript, data, result); })
    .then((result) => { return installer.writeFile(this.installerDataSvc.cdkMarker(), markerContent, result); })
    .then((result) => { return installer.execFile('powershell', opts, result); })
    .then((result) => { return this.setupVagrant(installer, result); })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }

  createEnvironment() {
    let env = {};

    //TODO Need to get this info from VagrantInstaller rather than hard code
    env['path'] = path.join(this.installerDataSvc.vagrantDir(), 'bin') + ';';

    return env;
  }

  setupVagrant(installer, result) {
    let self = this;
    return new Promise(function (resolve, reject) {
      let vagrantInstall = self.installerDataSvc.getInstallable(VagrantInstall.key());

      if (vagrantInstall !== undefined && vagrantInstall.isInstalled()) {
        return self.postVagrantSetup(installer, result)
        .then((res) => { return resolve(res); })
        .catch((err) => { return reject(err); });
      } else {
        Logger.info(CDKInstall.key() + ' - Vagrant has not finished installing, listener created to be called when it has.');
        ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == 'vagrant') {
            return self.postVagrantSetup(installer, result)
            .then((res) => { return resolve(res); })
            .catch((err) => { return reject(err); });
          }
        });
      }
    });
  }

  postVagrantSetup(installer, promise) {
    Logger.info(CDKInstall.key() + ' - postVagrantSetup called');
    let vagrantInstall = this.installerDataSvc.getInstallable(VagrantInstall.key());

    if (vagrantInstall !== undefined && vagrantInstall.isInstalled()) {
      // Vagrant is installed, add CDK bits
      let env = this.createEnvironment();
      let opts = {
        cwd: path.join(this.installerDataSvc.vagrantDir(), 'bin'),
        env: env
      };

      let res = installer.exec('vagrant plugin install ' + path.join(this.installerDataSvc.cdkDir(), 'plugins', 'vagrant-registration-1.0.0.gem'), opts, promise)
      .then((result) => { return installer.exec('vagrant box add --name cdk_v2 ' + path.join(this.installerDataSvc.cdkBoxDir(), this.boxName), opts, result); })
      .then((result) => { return installer.exec('vagrant plugin install ' + path.join(this.installerDataSvc.cdkDir(), 'plugins', 'vagrant-adbinfo-0.0.5.gem'), opts, result); });

      return res;
    }
  }
}

export default CDKInstall;
