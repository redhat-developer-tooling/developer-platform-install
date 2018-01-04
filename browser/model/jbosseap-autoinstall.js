'use strict';

let esc = require('xml-escape');

class JbosseapAutoInstallGenerator {
  constructor(jbosseapInstallDir, jdkInstallDir, version) {
    this.autoInstall = this.generate(jbosseapInstallDir, jdkInstallDir, version);
  }

  fileContent() {
    return this.autoInstall;
  }

  generate(jbosseapInstallDir, jdkInstallDir, jbosseapVersion) {
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
        '</com.izforge.izpack.panels.TreePacksPanel>',
        '<com.izforge.izpack.panels.UserInputPanel id="CreateUserPanel">',
        '<userInput>',
        '<entry key="adminUser" value="admin"/>',
        '<entry key="adminPassword" value="changeit!1"/>',
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
        '<com.izforge.izpack.panels.FinishPanel id="FinishPanel"/>',
        '</AutomatedInstallation>'
      ].join('\r\n');
    return temp;
  }
}
export default JbosseapAutoInstallGenerator;
