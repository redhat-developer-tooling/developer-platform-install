'use strict';

let fs = require('fs-extra');
let request = require('request');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import VagrantInstall from './vagrant';
import Installer from './helpers/installer';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, $timeout, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, installFile) {
    super('CDK', 900, cdkUrl, installFile);

    this.installerDataSvc = installerDataSvc;
    this.$timeout = $timeout;
    this.cdkBoxUrl = cdkBoxUrl;
    this.ocUrl = ocUrl;
    this.pscpUrl = pscpUrl;

    this.cdkFileName = 'cdk.zip';
    this.cdkDownloadedFile = path.join(this.installerDataSvc.tempDir(), this.cdkFileName);

    this.boxName = 'rhel-vagrant-virtualbox.box';
    this.cdkBoxDownloadedFile = path.join(this.installerDataSvc.tempDir(), this.boxName);

    this.ocFileName = 'oc.zip';
    this.ocDownloadedFile = path.join(this.installerDataSvc.tempDir(),   this.ocFileName);

    this.pscpFileName = 'pscp.exe';
    this.pscpDownloadedFile = path.join(this.installerDataSvc.tempDir(), this.pscpFileName);

    this.pscpPathScript = path.join(this.installerDataSvc.tempDir(), 'set-pscp-path.ps1');

    this.downloads = path.normalize(path.join(__dirname,"../../.."));
  }

  static key() {
    return 'cdk';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    let downloadSize = 869598013;

    let totalDownloads = 4;

    let downloader = new Downloader(progress, success, failure, downloadSize, totalDownloads);
    let username = this.installerDataSvc.getUsername(),
        password = this.installerDataSvc.getPassword();

    if(!fs.existsSync(path.join(this.downloads, this.boxName))) {
      let cdkBoxWriteStream = fs.createWriteStream(this.cdkBoxDownloadedFile);
      downloader.setWriteStream(cdkBoxWriteStream);
      downloader.download(this.cdkBoxUrl);
    } else {
      this.cdkBoxDownloadedFile = path.join(this.downloads, this.boxName);
      downloader.closeHandler();
    }

    if(!fs.existsSync(path.join(this.downloads, this.cdkFileName))) {
      // TODO Switch back to auth download when CDK latest is in Customer Portal
      // downloader.downloadAuth
      //   ({
      //     url: this.cdkBoxUrl,
      //     rejectUnauthorized: false
      //   }, username, password);
      let cdkWriteStream = fs.createWriteStream(this.cdkDownloadedFile);
      downloader.setWriteStream(cdkWriteStream);
      downloader.downloadAuth
      ({
        url: this.getDownloadUrl(),
        rejectUnauthorized: false
      }, username, password);
    } else {
      this.cdkDownloadedFile = path.join(this.downloads, this.cdkFileName);
      downloader.closeHandler();
    }

    if(!fs.existsSync(path.join(this.downloads, this.pscpFileName))) {
      let pscpWriteStream = fs.createWriteStream(this.pscpDownloadedFile);
      downloader.setWriteStream(pscpWriteStream);
      downloader.download(this.pscpUrl);
    } else {
      this.pscpDownloadedFile = path.join(this.downloads, this.pscpFileName);
      downloader.closeHandler();
    }

    if(!fs.existsSync(path.join(this.downloads, this.ocFileName))) {
      let ocWriteStream = fs.createWriteStream(this.ocDownloadedFile);
      if(!this.ocUrl.endsWith('.zip')) {
        request(this.ocUrl,(err,rsp,body) => {
          var fname = body.match(/openshift-origin-client-tools-v\w(\.\w){1,2}-\w{1,3}-\w{8}-\w{7}-windows\.zip/)[0];
          downloader.setWriteStream(ocWriteStream);
          this.ocUrl=this.ocUrl.concat(fname);
          downloader.download(this.ocUrl);
        });
      } else {
        downloader.setWriteStream(ocWriteStream);
        downloader.download(this.ocUrl);
      }
    } else {
      this.ocDownloadedFile = path.join(this.downloads, this.ocFileName);
      downloader.closeHandler();
    }
  }

  install(progress, success, failure) {
    let vagrantInstall = this.installerDataSvc.getInstallable(VagrantInstall.key());
    if( vagrantInstall !== undefined && vagrantInstall.isInstalled() ) {
      this.postVagrantInstall(progress, success, failure);
    } else {
      progress.setStatus('Waiting for Vagrant to finish installation');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'vagrant') {
          this.postVagrantInstall(progress, success, failure);
        }
      });
    }
  }

  postVagrantInstall(progress, success, failure) {
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
      'openshift.auth.username=openshift-dev',
      'openshift.auth.password=devel',
      'vagrant.binary.path=' + path.join(this.installerDataSvc.vagrantDir(), 'bin'),
      'oc.binary.path=' + this.installerDataSvc.ocDir(),
      'rhel.subscription.username=' + this.installerDataSvc.getUsername()
    ].join('\r\n');

    installer.unzip(this.cdkDownloadedFile, this.installerDataSvc.installDir())
    .then((result) => { return installer.unzip(this.ocDownloadedFile, this.installerDataSvc.ocDir(), result); })
    .then((result) => { return installer.copyFile(this.cdkBoxDownloadedFile, path.join(this.installerDataSvc.cdkBoxDir(), this.boxName), result); })
    .then((result) => { return installer.copyFile(this.pscpDownloadedFile, path.join(this.installerDataSvc.ocDir(), 'pscp.exe'), result); })
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
    return new Promise((resolve, reject) => {
      let vagrantInstall = this.installerDataSvc.getInstallable(VagrantInstall.key());

      if (vagrantInstall !== undefined && vagrantInstall.isInstalled()) {
        return this.postVagrantSetup(installer, result)
        .then((res) => { return resolve(res); })
        .catch((err) => { return reject(err); });
      } else {
        Logger.info(CDKInstall.key() + ' - Vagrant has not finished installing, listener created to be called when it has.');
        ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == 'vagrant') {
            return this.postVagrantSetup(installer, result)
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

      let res = installer.exec(
        'vagrant plugin install ' + path.join(this.installerDataSvc.cdkDir(), 'plugins', 'vagrant-registration-1.2.1.gem'), opts, promise
      ).then((result) => {
        return installer.exec('vagrant box add --name cdkv2 ' + path.join(this.installerDataSvc.cdkBoxDir(), this.boxName), opts, result);
      }).then((result) => {
        return installer.exec('vagrant plugin install ' + path.join(this.installerDataSvc.cdkDir(), 'plugins', 'vagrant-service-manager-0.0.4.gem'), opts, result);
      });

      return res;
    }
  }
}

export default CDKInstall;
