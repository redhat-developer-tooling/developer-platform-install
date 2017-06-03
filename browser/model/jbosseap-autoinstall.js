'use strict';

let path = require('path');
let esc = require('xml-escape');

import Platform from '../services/platform';

class JbosseapAutoInstallGenerator {
  constructor(jbosseapInstallDir, jdkInstallDir, version) {
    this.autoInstall = this.generate(jbosseapInstallDir, jdkInstallDir, version);
  }

  fileContent() {
    return this.autoInstall;
  }

  generate(jbosseapInstallDir, jdkInstallDir, jbosseapVersion) {
    let exeSuffix = Platform.OS === 'win32' ? 'w.exe' : '';
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
        '<com.izforge.izpack.panels.ShortcutPanel id="ShortcutPanel">',
        '<programGroup name="JBoss Platform"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="-jar &quot;' + esc(path.join(jbosseapInstallDir, 'Uninstaller', 'uninstaller.jar')) + '&quot;" createForAll="true" description="Uninstall the JBoss Platform ' + jbosseapVersion + '" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-uninstall.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Uninstall Platform ' + jbosseapVersion + '" target=  "' + esc(path.join(jdkInstallDir, 'bin', 'java')) + '" terminal="false" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="" createForAll="true" description="Start the standalone server" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-start.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Start Server (standalone)" target="' + esc(path.join(jbosseapInstallDir, 'bin', 'standalone.bat')) + '" terminal="true" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="" createForAll="true" description="Start the domain server" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-start.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Start Server (domain)" target="' + esc(path.join(jbosseapInstallDir, 'bin', 'domain.ico')) + '" terminal="true" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="/C start http:\\localhost:9990\console" createForAll="true" description="Launch the JBoss Administration Console" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-jmx.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="JBoss Administration Console (domain)" target="C:\Windows\System32\cmd.exe" terminal="false" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="/C start http:\\localhost:9990\console" createForAll="true" description="Launch the JBoss Administration Console" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-jmx.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="JBoss Administration Console (standalone)" target="C:\Windows\System32\cmd.exe" terminal="false" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="--connect command=:shutdown --controller=localhost:9990" createForAll="true" description="Shutdown the application server" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-stop.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Shutdown Server (standalone)" target="' + esc(path.join(jbosseapInstallDir, 'bin', 'jboss-cli.bat')) + '" terminal="true" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="--connect command=/host=master:shutdown --controller=localhost:9990" createForAll="true" description="Shutdown the application server" encoding="UTF-8" excludeOS="" group="true" icon="' + esc(path.join(jbosseapInstallDir, 'icons', '48-stop.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Shutdown Server (domain)" target=  "' + esc(path.join(jbosseapInstallDir, 'bin', 'jboss-cli.bat')) + '" terminal="true" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '</com.izforge.izpack.panels.ShortcutPanel>',
        '<com.izforge.izpack.panels.FinishPanel id="FinishPanel"/>',
        '</AutomatedInstallation>'
      ].join('\r\n');
    return temp;
  }
}
export default JbosseapAutoInstallGenerator;
