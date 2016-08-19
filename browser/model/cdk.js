'use strict';

let fs = require('fs-extra');
var filesystem = require("fs");
let request = require('request');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import VagrantInstall from './vagrant';
import Installer from './helpers/installer';
import Util from './helpers/util.js';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, $timeout, cdkUrl, cdkBoxUrl, ocUrl, installFile, targetFolderName) {
    super('cdk',
          900,
          cdkUrl,
          installFile,
          targetFolderName,
          installerDataSvc);

    this.$timeout = $timeout;
    this.cdkBoxUrl = cdkBoxUrl;
    this.ocUrl = ocUrl;

    this.downloads = {
      cdk: {
        fileName: 'cdk.zip',
        options: {
          url: cdkUrl,
          rejectUnauthorized: false
        },
        auth: true
      },
      box: {
        fileName: 'rhel-vagrant-virtualbox.box',
        options: { url: cdkBoxUrl }
      },
      oc: {
        fileName: 'oc.zip',
        options: { url: ocUrl }
      }
    };
    for (var item in this.downloads) {
      this.downloads[item].downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloads[item].fileName);
    }

    this.pscpPathScript = path.join(this.installerDataSvc.tempDir(), 'set-pscp-path.ps1');

    this.addOption('install','2.0.0','',true);
    this.selected = false;
  }

  static key() {
    return 'cdk';
  }


  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    let downloadSize = 869598013;
    let totalDownloads = Object.keys(this.downloads).length;

    this.downloader = new Downloader(progress, success, failure, downloadSize, totalDownloads);
    let username = this.installerDataSvc.getUsername(),
        password = this.installerDataSvc.getPassword();

    for (var item in this.downloads) {
      if(!fs.existsSync(path.join(this.downloadFolder, this.downloads[item].fileName))) {
        let opts = this.downloads[item].options;
        if (this.downloads[item].auth) {
          opts.auth = {
            user: username,
            pass: password
          };
        }
        this.downloader.download(opts, this.downloads[item].downloadedFile);
      } else {
        this.downloads[item].downloadedFile = path.join(this.downloadFolder, this.downloads[item].fileName);
        this.downloader.closeHandler();
      }
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

    installer.unzip(this.downloads.cdk.downloadedFile, this.installerDataSvc.installDir())
    .then((result) => { return installer.unzip(this.downloads.oc.downloadedFile, this.installerDataSvc.ocDir(), result); })
    .then((result) => { return installer.copyFile(this.downloads.box.downloadedFile, path.join(this.installerDataSvc.cdkBoxDir(), this.downloads.box.fileName), result); })
    .then((result) => { return installer.writeFile(this.pscpPathScript, data, result); })
    .then((result) => { return installer.writeFile(this.installerDataSvc.cdkMarker(), markerContent, result); })
    .then((result) => { return installer.execFile('powershell', opts, result); })
    .then((result) => { return this.setupVagrant(installer, result); })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }

  createEnvironment() {
    let env = Object.assign({},process.env);
    let vagrantInstall = this.installerDataSvc.getInstallable('vagrant');
    let vboxInstall = this.installerDataSvc.getInstallable('virtualbox');
    let cygwinInstall = this.installerDataSvc.getInstallable('cygwin');
    let vgrPath = vagrantInstall.getLocation();
    let vboxPath = vboxInstall.getLocation();
    let cygwinPath = cygwinInstall.getLocation();
    env['Path'] = env['Path']
      + path.delimiter + path.join(vgrPath,'bin')
      + path.delimiter + path.join(cygwinPath,'bin')
      + path.delimiter + vboxPath;
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
    if (vagrantInstall.isInstalled()) {
      // Vagrant is installed, add CDK bits
      let opts = {
        env: this.createEnvironment(),
        cwd: this.installerDataSvc.cdkBoxDir()
      };
      let cdkPluginsDir = path.join(this.installerDataSvc.cdkDir(), 'plugins');
      // fill gem installation chain
      let execs = this.createGemInstalls(installer,cdkPluginsDir, opts);
      // add command to remove existing box and to add it back again
      execs.push((result)=>{
        return new Promise((resolve,reject) => {
          installer.exec('vagrant box remove cdkv2 -f',opts, promise).then((result)=> {
            resolve(result);
          }).catch((result) => {
            resolve(result);
          });
        });
      },(result)=>{
        return installer.exec('vagrant box add --name cdkv2 ' + this.downloads.box.fileName , opts, result);
      },(result)=>{
        return installer.exec('vagrant plugin install landrush', opts);
      });
      return Util.runPromiseSequence(execs);
    }
  }

  createGemInstalls(installer,dir,opts) {
    var results = [];
    filesystem.readdirSync(dir).forEach((file)=>{
        file = path.join(dir,file);
        var stat = filesystem.statSync(file);
        if (stat && !stat.isDirectory() && path.extname(file)=='.gem') {
          results.push((result)=>{
            return installer.exec('vagrant plugin install "' + file + '"', opts, result);
          });
        }
    });
    return results;
  }
}

export default CDKInstall;
