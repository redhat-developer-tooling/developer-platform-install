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

class FusePlatformInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, file) {
    super(FusePlatformInstall.KEY, file.platform.dmUrl, file.platform.fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = file.platform.sha256sum;
    this.addOption('install', this.version, '', true);
    this.files = file;
    this.jbeap = file.eap;
    this.jbeap.bundledFile = path.join(this.bundleFolder, this.jbeap.fileName);
    this.jbeap.downloadedFile = path.join(this.downloadFolder, this.jbeap.fileName);
    this.platform = file.platform;
    this.platform.bundledFile = path.join(this.bundleFolder, this.platform.fileName);
    this.platform.downloadedFile = path.join(this.downloadFolder, this.platform.fileName);
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbosseap640-autoinstall.xml');
    this.totalDownloads = 2;
  }

  static get KEY() {
    return 'fuseplatform';
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
      return this.headlessEapInstall(installer);
    }).then(()=> {
      return this.headlessInstall(installer);
    }).then(()=> {
      this.ipcRenderer.on('installComplete', (event, arg)=> {
        if(arg == 'all') {
          let devstudio = this.installerDataSvc.getInstallable('devstudio');
          if(devstudio.installed) {
            devstudio.configureRuntimeDetection('fuse-platform-on-eap', this.installerDataSvc.fuseplatformDir());
          }
        }
      });

      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
    });
  }

  headlessInstall(installer) {
    Logger.info(this.keyName + ' - headlessInstall() called');
    return installer.execFile(this.javaPath, this.installArgs, this.installOptions);
  }

  get installOptions() {
    return {cwd: this.installerDataSvc.fuseplatformDir()};
  }

  get installArgs() {
    return [
      '-jar',
      this.platform.downloadedFile
    ];
  }

  headlessEapInstall(installer) {
    Logger.info(this.keyName + ' - headlessEapInstall() called');
    return installer.execFile(this.javaPath, this.eapInstallArgs);
  }

  get eapInstallArgs() {
    return [
      '-DTRACE=true',
      '-jar',
      this.jbeap.downloadedFile,
      this.installConfigFile
    ];
  }

  get javaPath() {
    return path.join(this.installerDataSvc.jdkDir(), 'bin', 'java');
  }

  isConfigurationValid() {
    let jdk = this.installerDataSvc.getInstallable('jdk');
    return jdk.isConfigured()
      && this.isConfigured()
      || this.isSkipped();
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
<entry key="adminPassword" value="changeit1!"/>
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
