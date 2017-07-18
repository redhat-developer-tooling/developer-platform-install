'use strict';

import path from 'path';
import fs from 'fs-extra';
import esc from 'xml-escape';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';

import Downloader from './helpers/downloader';
import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

class FusePlatformInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, file) {
    super(FusePlatformInstall.KEY, file.platform.dmUrl, file.platform.fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = file.platform.sha256sum;
    this.addOption('install', this.version, '', true);
    this.jbeap = file.eap;
    this.jbeap.bundledFile = path.join(this.bundleFolder, this.jbeap.fileName);
    this.jbeap.downloadedFile = path.join(this.downloadFolder, this.jbeap.fileName);
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbosseap640-autoinstall.xml');
  }

  static get KEY() {
    return 'fuseplatform';
  }

  downloadInstaller(progress, success, failure) {
    let totalDownloads = 2;
    this.downloader = new Downloader(progress, success, failure, totalDownloads);
    let username = this.installerDataSvc.getUsername(),
      password = this.installerDataSvc.getPassword();

    if(fs.existsSync(this.bundledFile)) {
      this.downloadedFile = this.bundledFile;
      this.downloader.closeHandler();
    } else {
      this.checkAndDownload(
        this.downloadedFile,
        this.downloadUrl,
        this.sha256,
        username,
        password,
        progress
      );
    }

    if(fs.existsSync(this.jbeap.bundledFile)) {
      this.jbeap.downloadedFile = this.jbeap.bundledFile;
      this.downloader.closeHandler();
    } else {
      this.checkAndDownload(
        this.jbeap.downloadedFile,
        this.jbeap.dmUrl,
        this.jbeap.sha256sum,
        username,
        password,
        progress
      );
    }
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let fusePlatformDir = this.installerDataSvc.fuseplatformDir();
    let installer = new Installer(FusePlatformInstall.KEY, progress, success, failure);
    if(fs.existsSync(this.installerDataSvc.fuseplatformDir())) {
      rimraf.sync(this.installerDataSvc.fuseplatformDir());
    }
    mkdirp.sync(fusePlatformDir);
    return Promise.resolve().then(()=> {
      return installer.writeFile(this.installConfigFile, installGenerator(this.installerDataSvc.fuseplatformDir()));
    }).then(()=> {
      return this.postJDKInstall(installer);
    }).then(()=> {
      let devstudio = this.installerDataSvc.getInstallable('devstudio');
      if(devstudio.installed) {
        devstudio.configureRuntimeDetection('fuse-platform-on-eap', this.installerDataSvc.fuseplatformDir());
      } else {
        this.ipcRenderer.on('installComplete', (event, arg)=> {
          if(arg == 'fusetools') {
            devstudio.configureRuntimeDetection('fuse-platform-on-eap', this.installerDataSvc.fuseplatformDir());
          }
        });
      }
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
    });
  }

  postJDKInstall(installer) {
    return new Promise((resolve, reject) => {
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.KEY);
      if (jdkInstall.isInstalled()) {
        return Promise.resolve().then(()=> {
          return this.headlessEapInstall(installer);
        }).then(()=> {
          return this.headlessInstall(installer);
        }).then((res) => {
          resolve(res);
        }).catch((err) => {
          reject(err);
        });
      } else {
        Logger.info(this.keyName + ' - JDK has not finished installing, listener created to be called when it has.');
        this.ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.KEY) {
            return Promise.resolve().then(()=> {
              return this.headlessEapInstall(installer);
            }).then(()=> {
              return this.headlessInstall(installer);
            }).then((res) => {
              resolve(res);
            }).catch((err) => {
              reject(err);
            });
          }
        });
      }
    });
  }

  headlessInstall(installer) {
    Logger.info(this.keyName + ' - headlessInstall() called');
    let javaOpts = [
      '-DTRACE=true',
      '-jar',
      this.downloadedFile
    ];
    let res = installer.execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts, {cwd: this.installerDataSvc.fuseplatformDir()}
    );

    return res;
  }

  headlessEapInstall(installer) {
    Logger.info(this.keyName + ' - headlessEapInstall() called');
    let javaOpts = [
      '-DTRACE=true',
      '-jar',
      this.jbeap.downloadedFile,
      this.installConfigFile
    ];
    let res = installer.execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts
    );

    return res;
  }
}

function installGenerator(jbosseapInstallDir) {
  let temp =`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<AutomatedInstallation langpack="eng">
<productName>EAP</productName>
<productVersion>6.4.0</productVersion>
<com.izforge.izpack.panels.HTMLLicencePanel id="HTMLLicencePanel"/>
<com.izforge.izpack.panels.TargetPanel id="DirectoryPanel">
<installpath>${esc(jbosseapInstallDir)}</installpath>
</com.izforge.izpack.panels.TargetPanel>
<com.izforge.izpack.panels.TreePacksPanel id="TreePacksPanel">
<pack index="0" name="Red Hat JBoss Enterprise Application Platform" selected="true"/>
<pack index="1" name="AppClient" selected="true"/>
<pack index="2" name="Bin" selected="true"/>
<pack index="3" name="Bundles" selected="true"/>
<pack index="4" name="XMLs and XSDs" selected="true"/>
<pack index="5" name="Domain" selected="true"/>
<pack index="6" name="Domain Batch Scripts" selected="true"/>
<pack index="7" name="Modules" selected="true"/>
<pack index="8" name="Standalone" selected="true"/>
<pack index="9" name="Standalone Batch Scripts" selected="true"/>
<pack index="10" name="Welcome Content" selected="true"/>
<pack index="11" name="Quickstarts" selected="false"/>
<pack index="12" name="Red Hat JBoss Enterprise Application Platform Natives" selected="true"/>
<pack index="13" name="Native Windows-x86_64" selected="true"/>
<pack index="14" name="Native Utils Windows-x86_64" selected="true"/>
<pack index="15" name="Native Webserver Windows-x86_64" selected="true"/>
</com.izforge.izpack.panels.TreePacksPanel>
<com.izforge.izpack.panels.UserInputPanel id="CreateUserPanel">
<userInput>
<entry key="adminUser" value="admin"/>
<entry key="adminPassword" value="changeit"/>
</userInput>
</com.izforge.izpack.panels.UserInputPanel>
<com.izforge.izpack.panels.UserInputPanel id="QuickStartsPanel">
<userInput>
<entry key="installQuickStarts" value="false"/>
</userInput>
</com.izforge.izpack.panels.UserInputPanel>
<com.redhat.installer.installation.maven.panel.MavenRepoCheckPanel id="MavenRepoCheckPanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketBindingPanel">
<userInput>
<entry key="portDecision" value="false"/>
<entry key="pureIPv6" value="false"/>
</userInput>
</com.izforge.izpack.panels.UserInputPanel>
<com.izforge.izpack.panels.UserInputPanel id="SocketStandalonePanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketHaStandalonePanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketFullStandalonePanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketFullHaStandalonePanel"/>
<com.izforge.izpack.panels.UserInputPanel id="HostDomainPanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketDomainPanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketHaDomainPanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketFullDomainPanel"/>
<com.izforge.izpack.panels.UserInputPanel id="SocketFullHaDomainPanel"/>
<com.izforge.izpack.panels.UserInputPanel id="ServerLaunchPanel">
<userInput>
<entry key="serverStartup" value="none"/>
</userInput>
</com.izforge.izpack.panels.UserInputPanel>
<com.izforge.izpack.panels.UserInputPanel id="LoggingOptionsPanel">
<userInput>
<entry key="configureLog" value="false"/>
</userInput>
</com.izforge.izpack.panels.UserInputPanel>
<com.izforge.izpack.panels.UserInputPanel id="postinstall">
<userInput>
<entry key="postinstallServer" value="false"/>
</userInput>
</com.izforge.izpack.panels.UserInputPanel>
<com.izforge.izpack.panels.UserInputPanel id="vaultsecurity"/>
<com.izforge.izpack.panels.UserInputPanel id="sslsecurity"/>
<com.izforge.izpack.panels.UserInputPanel id="ldapsecurity"/>
<com.izforge.izpack.panels.UserInputPanel id="ldapsecurity2"/>
<com.izforge.izpack.panels.UserInputPanel id="infinispan"/>
<com.redhat.installer.asconfiguration.securitydomain.panel.SecurityDomainPanel id="Security Domain Panel"/>
<com.izforge.izpack.panels.UserInputPanel id="jsssecuritydomain"/>
<com.redhat.installer.asconfiguration.jdbc.panel.JBossJDBCDriverSetupPanel id="JDBC Setup Panel"/>
<com.redhat.installer.asconfiguration.datasource.panel.JBossDatasourceConfigPanel id="Datasource Configuration Panel"/>
<com.izforge.izpack.panels.SummaryPanel id="SummaryPanel"/>
<com.izforge.izpack.panels.InstallPanel id="InstallPanel"/>
<com.izforge.izpack.panels.ProcessPanel id="ProcessPanel"/>
<com.izforge.izpack.panels.ShortcutPanel id="ShortcutPanel"/>
<com.izforge.izpack.panels.FinishPanel id="FinishPanel"/>
</AutomatedInstallation>`;
  return temp;
}

function fromJson({ installerDataSvc, targetFolderName, file}) {
  return new FusePlatformInstall(installerDataSvc, targetFolderName, file);
}

FusePlatformInstall.convertor = {fromJson};

export default FusePlatformInstall;
