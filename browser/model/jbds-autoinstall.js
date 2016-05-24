'use strict';

let path = require('path');

class JbdsAutoInstallGenerator {
  constructor(jbdsInstallDir, jdkInstallDir) {
    this.autoInstall = this.generate(jbdsInstallDir, jdkInstallDir);
  }

  fileContent() {
    return this.autoInstall;
  }

  generate(jbdsInstallDir, jdkInstallDir) {
    let jbdsVersion = "9.1";
    let temp =
      [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        '<AutomatedInstallation langpack="eng">',
        '<com.jboss.devstudio.core.installer.HTMLInfoPanelWithRootWarning id="introduction"/>',
        '<com.izforge.izpack.panels.HTMLLicencePanel id="licence"/>',
        '<com.jboss.devstudio.core.installer.PathInputPanel id="target">',
        '<installpath>' + jbdsInstallDir + '</installpath>',
        '</com.jboss.devstudio.core.installer.PathInputPanel>',
        '<com.jboss.devstudio.core.installer.JREPathPanel id="jre"/>',
        '<com.jboss.devstudio.core.installer.JBossAsSelectPanel id="as">',
        '<installgroup>devstudio</installgroup>',
        '</com.jboss.devstudio.core.installer.JBossAsSelectPanel>',
        '<com.jboss.devstudio.core.installer.InstallAdditionalFeaturesPanel id="features">',
        '<ius>com.jboss.devstudio.core.package,org.testng.eclipse.feature.group</ius>',
        '<locations>devstudio</locations>',
        '</com.jboss.devstudio.core.installer.InstallAdditionalFeaturesPanel>',
        '<com.jboss.devstudio.core.installer.UpdatePacksPanel id="updatepacks"/>',
        '<com.jboss.devstudio.core.installer.DiskSpaceCheckPanel id="diskspacecheck"/>',
        '<com.izforge.izpack.panels.SummaryPanel id="summary"/>',
        '<com.izforge.izpack.panels.InstallPanel id="install"/>',
        '<com.jboss.devstudio.core.installer.CreateLinkPanel id="createlink">',
        '<jrelocation>' + path.join(jdkInstallDir, 'bin', 'javaw.exe') + '</jrelocation>',
        '</com.jboss.devstudio.core.installer.CreateLinkPanel>',
        '<com.izforge.izpack.panels.ShortcutPanel id="shortcut">',
        '<programGroup name="Red Hat JBoss Developer Studio ' + jbdsVersion + '"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="" createForAll="false" description="Start Red Hat JBoss Developer Studio ' + jbdsVersion + '" encoding="" group="false" icon="' + path.join(jbdsInstallDir, 'studio', 'jbds.ico') + '" iconIndex="0" initialState="1" mimetype="" name="Red Hat JBoss Developer Studio ' + jbdsVersion + '" target="' + path.join(jbdsInstallDir, 'studio', 'jbdevstudio.exe') + '" terminal="" terminalOptions="" tryexec="" type="3" url="" usertype="0" workingDirectory="' + path.join(jbdsInstallDir, 'studio') + '"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="" createForAll="false" description="Start Red Hat JBoss Developer Studio ' + jbdsVersion + '" encoding="" group="true" icon="' + path.join(jbdsInstallDir, 'studio', 'jbds.ico') + '" iconIndex="0" initialState="1" mimetype="" name="Red Hat JBoss Developer Studio ' + jbdsVersion + '" target="' + path.join(jbdsInstallDir, 'studio', 'jbdevstudio.exe') + '" terminal="" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory="' + path.join(jbdsInstallDir, 'studio') + '"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="-jar &quot;' + path.join(jbdsInstallDir, 'Uninstaller', 'uninstaller.jar') + '&quot;" createForAll="false" description="Uninstall Red Hat JBoss Developer Studio ' + jbdsVersion + '" encoding="" group="true" icon="' + path.join(jbdsInstallDir, 'studio', 'jbds_uninstall.ico') + '" iconIndex="0" initialState="1" mimetype="" name="Uninstall Red Hat JBoss Developer Studio ' + jbdsVersion + '" target="' + path.join(jdkInstallDir, 'bin', 'javaw.exe') + '" terminal="" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '</com.izforge.izpack.panels.ShortcutPanel>',
        '<com.jboss.devstudio.core.installer.ShortcutPanelPatch id="shortcutpatch"/>',
        '<com.izforge.izpack.panels.SimpleFinishPanel id="finish"/>',
        '</AutomatedInstallation>'
      ].join('\r\n');

      return temp;
  }
}
export default JbdsAutoInstallGenerator;
