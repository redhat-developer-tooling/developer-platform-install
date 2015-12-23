'use strict';

let fs = require('fs-extra');
let request = require('request');
let path = require('path');
let unzip = require('unzip');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import VagrantInstall from './vagrant';

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
    downloader.download(this.vagrantFileUrl)

    downloader.setWriteStream(pscpWriteStream);
    downloader.download(this.pscpUrl)
  }

  install(progress, success, failure) {
    progress.setStatus('Installing');

    Logger.info(CDKInstall.key() + ' - Extract CDK zip to ' + this.installerDataSvc.installDir());

    fs.createReadStream(this.cdkDownloadedFile)
      .pipe(unzip.Extract({path: this.installerDataSvc.installDir()}))
      .on('close', () => {
        Logger.info(CDKInstall.key() + ' - Extract CDK zip to ' + this.installerDataSvc.installDir() + ' SUCCESS');

        Logger.info(CDKInstall.key() + ' - Move CDK Vagrant Box to ' + path.join(this.installerDataSvc.cdkBoxDir(), this.boxName));

        fs.move(this.cdkBoxDownloadedFile, path.join(this.installerDataSvc.cdkBoxDir(), this.boxName), (err) => {
          if (err) {
            Logger.error(CDKInstall.key() + ' - ' + err);
            return failure(err);
          }

          Logger.info(CDKInstall.key() + ' - Move CDK Vagrant Box to ' + path.join(this.installerDataSvc.cdkBoxDir(), this.boxName) + ' SUCCESS');

          Logger.info(CDKInstall.key() + ' - Extract OpenShift Client Binary to ' + this.installerDataSvc.ocDir());

          fs.createReadStream(this.ocDownloadedFile)
            .pipe(unzip.Extract({path: this.installerDataSvc.ocDir()}))
            .on('close', () => {
              Logger.info(CDKInstall.key() + ' - Extract OpenShift Client Binary to ' + this.installerDataSvc.ocDir() + ' SUCCESS');

              Logger.info(CDKInstall.key() + ' - Extract Vagrantfile for OpenShift to ' + this.installerDataSvc.tempDir());

              fs.createReadStream(this.vagrantDownloadedFile)
                .pipe(unzip.Extract({path: this.installerDataSvc.tempDir()}))
                .on('close', () => {
                  Logger.info(CDKInstall.key() + ' - Extract Vagrantfile for OpenShift to ' + this.installerDataSvc.tempDir() + ' SUCCESS');

                  Logger.info(CDKInstall.key() + ' - Move Vagrantfile for OpenShift to ' + this.installerDataSvc.cdkVagrantfileDir());

                  fs.move(
                    path.join(this.installerDataSvc.tempDir(), 'openshift-vagrant-master', 'cdk-v2'),
                    this.installerDataSvc.cdkVagrantfileDir(),
                    (err) => {
                      if (err) {
                        Logger.error(CDKInstall.key() + ' - ' + err);
                        return failure(err);
                      }

                      Logger.info(CDKInstall.key() + ' - Move Vagrantfile for OpenShift to ' + this.installerDataSvc.cdkVagrantfileDir() + ' SUCCESS');

                      Logger.info(CDKInstall.key() + ' - Move pscp.exe to ' + this.installerDataSvc.ocDir());

                      fs.move(
                        this.pscpDownloadedFile,
                        path.join(this.installerDataSvc.ocDir(), 'pscp.exe'),
                        (err) => {
                          if (err) {
                            Logger.error(CDKInstall.key() + ' - ' + err);
                            return failure(err);
                          }

                          Logger.info(CDKInstall.key() + ' - Move pscp.exe to ' + this.installerDataSvc.ocDir() + ' SUCCESS');

                          // Set required paths
                          let data = [
                            '$newPath = "' + this.installerDataSvc.ocDir() + '";',
                            '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
                            '[Environment]::SetEnvironmentVariable("Path", "$newPath;$oldPath", "User");',
                            '[Environment]::Exit(0)'
                          ].join('\r\n');

                          Logger.info(CDKInstall.key() + ' - Write path script file to ' + this.pscpPathScript);
                          fs.writeFileSync(this.pscpPathScript, data);
                          Logger.info(CDKInstall.key() + ' - Write path script file to ' + this.pscpPathScript + ' SUCCESS');

                          Logger.info(CDKInstall.key() + ' - Execute path script file ' + this.pscpPathScript);

                          require('child_process')
                            .execFile(
                              'powershell',
                              [
                                '-ExecutionPolicy',
                                'ByPass',
                                '-File',
                                this.pscpPathScript
                              ],
                              (error, stdout, stderr) => {
                                if (error && error != '') {
                                  Logger.error(CDKInstall.key() + ' - ' + error);
                                  Logger.error(CDKInstall.key() + ' - ' + stderr);
                                  return failure(error);
                                }

                                if (stdout && stdout != '') {
                                  Logger.info(CDKInstall.key() + ' - ' + stdout);
                                }
                                Logger.info(CDKInstall.key() + ' - Execute path script file ' + this.pscpPathScript + ' SUCCESS');

                                let markerContent = [
                                  'openshift.auth.scheme=Basic',
                                  'openshift.auth.username=test-admin',
                                  'vagrant.binary.path=' + path.join(this.installerDataSvc.vagrantDir(), 'bin'),
                                  'oc.binary.path=' + this.installerDataSvc.ocDir(),
                                  'rhel.subscription.username=' + this.installerDataSvc.getUsername()
                                ].join('\r\n');

                                Logger.info(CDKInstall.key() + ' - Write .cdk marker content to ' + this.installerDataSvc.cdkMarker());
                                fs.writeFileSync(this.installerDataSvc.cdkMarker(), markerContent);
                                Logger.info(CDKInstall.key() + ' - Write .cdk marker content to ' + this.installerDataSvc.cdkMarker() + ' SUCCESS');

                                let vagrantInstall = this.installerDataSvc.getInstallable(VagrantInstall.key());

                                if (vagrantInstall !== undefined && vagrantInstall.isInstalled()) {
                                  this.postVagrantSetup(progress, success, failure);
                                } else {
                                  Logger.info(CDKInstall.key() + ' - Vagrant has not finished installing, listener created to be called when it has.');
                                  ipcRenderer.on('installComplete', (event, arg) => {
                                    if (arg == VagrantInstall.key()) {
                                      this.postVagrantSetup(progress, success, failure);
                                    }
                                  });
                                }
                              }
                            );
                        }
                      );
                  });
                });
            });
        });
      });
  }

  createEnvironment() {
    let env = {};

    //TODO Need to get this info from VagrantInstaller rather than hard code
    env['path'] = path.join(this.installerDataSvc.vagrantDir(), 'bin') + ';';

    return env;
  }

  postVagrantSetup(progress, success, failure) {
    Logger.info(CDKInstall.key() + ' - postVagrantSetup() called');

    // Vagrant is installed, add CDK bits
    let env = this.createEnvironment();

    Logger.info(CDKInstall.key() + ' - Install registration plugin to vagrant');

    require('child_process')
      .exec(
        'vagrant plugin install ' +
        path.join(this.installerDataSvc.cdkDir(), 'plugins', 'vagrant-registration-1.0.0.gem'),
        {
          cwd: path.join(this.installerDataSvc.vagrantDir(), 'bin'),
          env: env
        },
        (error, stdout, stderr) => {
          if (error && error != '') {
            Logger.error(CDKInstall.key() + ' - ' + error);
            Logger.error(CDKInstall.key() + ' - ' + stderr);
            return failure(error);
          }

          if (stdout && stdout != '') {
            Logger.info(CDKInstall.key() + ' - ' + stdout);
          }
          Logger.info(CDKInstall.key() + ' - Install registration plugin to vagrant SUCCESS');

          Logger.info(CDKInstall.key() + ' - Install adbinfo plugin to vagrant');

          require('child_process')
            .exec(
              'vagrant plugin install ' +
              path.join(this.installerDataSvc.cdkDir(), 'plugins', 'vagrant-adbinfo-0.0.5.gem'),
              {
                cwd: path.join(this.installerDataSvc.vagrantDir(), 'bin'),
                env: env
              },
              (error, stdout, stderr) => {
                if (error && error != '') {
                  Logger.error(CDKInstall.key() + ' - ' + error);
                  Logger.error(CDKInstall.key() + ' - ' + stderr);
                  return failure(error);
                }

                if (stdout && stdout != '') {
                  Logger.info(CDKInstall.key() + ' - ' + stdout);
                }
                Logger.info(CDKInstall.key() + ' - Install adbinfo plugin to vagrant SUCCESS');

                Logger.info(CDKInstall.key() + ' - Install cdk_v2 box to vagrant');

                require('child_process')
                  .exec(
                    'vagrant box add --name cdk_v2 ' +
                    path.join(this.installerDataSvc.cdkBoxDir(), this.boxName),
                    {
                      cwd: path.join(this.installerDataSvc.vagrantDir(), 'bin'),
                      env: env
                    },
                    (error, stdout, stderr) => {
                      if (error && error != '') {
                        Logger.error(CDKInstall.key() + ' - ' + error);
                        Logger.error(CDKInstall.key() + ' - ' + stderr);
                        return failure(error);
                      }

                      if (stdout && stdout != '') {
                        Logger.info(CDKInstall.key() + ' - ' + stdout);
                      }
                      Logger.info(CDKInstall.key() + ' - Install cdk_v2 box to vagrant SUCCESS');

                      progress.setComplete();
                      success();
                    }
                  );
              }
            );
        }
      );
  }
}

export default CDKInstall;
