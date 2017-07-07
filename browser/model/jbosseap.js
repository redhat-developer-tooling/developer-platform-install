'use strict';

import path from 'path';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import esc from 'xml-escape';

import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

class JbosseapInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum, generator = installGenerator) {
    super(JbosseapInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbosseap-autoinstall.xml');
    this.configFile = path.join(this.installerDataSvc.tempDir(), 'jbosseap-autoinstall.xml.variables');
    this.installGenerator = generator;
    this.addOption('install', this.version, '', true);
  }

  static get KEY() {
    return 'jbosseap';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let version = /(\d+\.\d+\.\d+).*/.exec(this.version)[1];
    let installer = new Installer(this.keyName, progress, success, failure);

    if(fs.existsSync(this.installerDataSvc.jbosseapDir())) {
      rimraf.sync(this.installerDataSvc.jbosseapDir());
    }

    Logger.info(this.keyName + ' - Generate jbosseap auto install file content');
    let data = this.installGenerator(this.installerDataSvc.jbosseapDir(), this.installerDataSvc.jdkDir(), version);
    Logger.info(this.keyName + ' - Generate jbosseap auto install file content SUCCESS');
    return installer.writeFile(this.installConfigFile, data)
      .then((result) => {
        installer.writeFile(this.configFile, 'adminPassword=changeit');
        return this.postJDKInstall(installer, result);
      })
      .then(() => {
        let devstudio = this.installerDataSvc.getInstallable('devstudio');
        if(devstudio.installed) {
          this.configureRuntimeDetection();
        } else {
          let that = this;
          this.ipcRenderer.on('installComplete', function(event, arg) {
            if(arg == 'devstudio') {
              that.configureRuntimeDetection();
            }
          });
        }
        installer.succeed(true);
      })
      .catch((error) => {
        installer.fail(error);
      });
  }

  configureRuntimeDetection() {
    let runtimeproperties = path.join(this.installerDataSvc.devstudioDir(), 'studio', 'runtime_locations.properties');
    let escapedLocation = this.installerDataSvc.jbosseapDir().replace(/\\/g, '\\\\').replace(/\:/g, '\\:');
    if(fs.existsSync(runtimeproperties)) {
      fs.appendFile(runtimeproperties, `\njbosseap=${escapedLocation},true`).catch((error)=>{
        Logger.error(this.keyName + ' - error occured during runtime detection configuration in DevStudio');
        Logger.error(this.keyName + ` -  ${error}`);
      });
    }
  }

  postJDKInstall(installer, result) {
    return new Promise((resolve, reject) => {
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.KEY);

      if (jdkInstall.isInstalled()) {
        return this.headlessInstall(installer, result)
          .then((res) => { resolve(res); })
          .catch((err) => { reject(err); });
      } else {
        Logger.info(this.keyName + ' - JDK has not finished installing, listener created to be called when it has.');
        this.ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.KEY) {
            return this.headlessInstall(installer, result)
              .then((res) => { resolve(res); })
              .catch((err) => { reject(err); });
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
      this.downloadedFile,
      this.installConfigFile
    ];
    let res = installer.execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java'), javaOpts
    );

    return res;
  }
}

function fromJson({ installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new JbosseapInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

function installGenerator(jbosseapInstallDir, jdkInstallDir, jbosseapVersion) {
  let temp =
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
      '<AutomatedInstallation langpack="eng">',
      '<productName>EAP</productName>',
      '<productVersion>' + jbosseapVersion + '</productVersion>',
      '<com.izforge.izpack.panels.HTMLLicencePanel id="HTMLLicencePanel"/>',
      '<com.izforge.izpack.panels.TargetPanel id="DirectoryPanel">',
      '<installpath>' + esc(jbosseapInstallDir) + '</installpath>',
      '</com.izforge.izpack.panels.TargetPanel>',
      '<com.izforge.izpack.panels.TreePacksPanel id="TreePacksPanel">',
      '<pack index="0" name="Red Hat JBoss Enterprise Application Platform" selected="true"/>',
      '<pack index="1" name="AppClient" selected="true"/>',
      '<pack index="2" name="XMLs and XSDs" selected="true"/>',
      '<pack index="3" name="Modules" selected="true"/>',
      '<pack index="4" name="Welcome Content" selected="true"/>',
      '<pack index="5" name="Quickstarts" selected="false"/>',
      '<pack index="6" name="Icons" selected="true"/>',
      '</com.izforge.izpack.panels.TreePacksPanel>',
      '<com.izforge.izpack.panels.UserInputPanel id="CreateUserPanel">',
      '<userInput>',
      '<entry key="adminUser" value="admin"/>',
      '<entry autoPrompt="true" key="adminPassword"/>',
      '</userInput>',
      '</com.izforge.izpack.panels.UserInputPanel>',
      '<com.izforge.izpack.panels.SummaryPanel id="SummaryPanel"/>',
      '<com.izforge.izpack.panels.InstallPanel id="InstallPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="postinstall">',
      '<userInput>',
      '<entry key="postinstallServer" value="false"/>',
      '</userInput>',
      '</com.izforge.izpack.panels.UserInputPanel>',
      '<com.izforge.izpack.panels.UserInputPanel id="vaultsecurity"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="sslsecurity"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="ldapsecurity"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="ldapsecurity2"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="infinispan"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="Security Domain Panel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="jsssecuritydomain"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="QuickStartsPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="MavenRepoCheckPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketBindingPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketStandalonePanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketHaStandalonePanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketFullStandalonePanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketFullHaStandalonePanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="HostDomainPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketDomainPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketHaDomainPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketFullDomainPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="SocketFullHaDomainPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="ServerLaunchPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="LoggingOptionsPanel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="JSF jar Setup Panel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="JDBC Setup Panel"/>',
      '<com.izforge.izpack.panels.UserInputPanel id="Datasource Configuration Panel"/>',
      '<com.izforge.izpack.panels.ProcessPanel id="ProcessPanel"/>',
      '<com.izforge.izpack.panels.ShortcutPanel id="ShortcutPanel"/>',
      '</AutomatedInstallation>'
    ].join('\r\n');
  return temp;
}

JbosseapInstall.convertor = {fromJson};

export default JbosseapInstall;
