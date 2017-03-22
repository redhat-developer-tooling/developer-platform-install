'use strict';

let path = require('path');
let esc = require('xml-escape');

import Platform from '../services/platform';

class DevstudioAutoInstallGenerator {
  constructor(devstudioInstallDir, jdkInstallDir, version) {
    this.autoInstall = this.generate(devstudioInstallDir, jdkInstallDir, version);
  }

  fileContent() {
    return this.autoInstall;
  }

  generate(devstudioInstallDir, jdkInstallDir, devstudioVersion) {
    let exeSuffix = Platform.OS === 'win32' ? 'w.exe' : '';
    let temp =
      [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        '<AutomatedInstallation langpack="eng">',
        '<com.jboss.devstudio.core.installer.HTMLInfoPanelWithRootWarning id="introduction"/>',
        '<com.izforge.izpack.panels.HTMLLicencePanel id="licence"/>',
        '<com.jboss.devstudio.core.installer.PathInputPanel id="target">',
        '<installpath>' + esc(devstudioInstallDir) + '</installpath>',
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
        '<jrelocation>' + esc(path.join(jdkInstallDir, 'bin', 'java' + exeSuffix)) + '</jrelocation>',
        '</com.jboss.devstudio.core.installer.CreateLinkPanel>',
        '<com.izforge.izpack.panels.ShortcutPanel id="shortcut">',
        '<programGroup name="Red Hat JBoss Developer Studio ' + devstudioVersion + '"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="" createForAll="false" description="Start Red Hat JBoss Developer Studio ' + devstudioVersion + '" encoding="" group="false" icon="' + esc(path.join(devstudioInstallDir, 'studio', 'devstudio.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Red Hat JBoss Developer Studio ' + devstudioVersion + '" target="' + esc(path.join(devstudioInstallDir, 'studio', 'devstudio.exe')) + '" terminal="" terminalOptions="" tryexec="" type="3" url="" usertype="0" workingDirectory="' + esc(path.join(devstudioInstallDir, 'studio')) + '"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="" createForAll="false" description="Start Red Hat JBoss Developer Studio ' + devstudioVersion + '" encoding="" group="true" icon="' + esc(path.join(devstudioInstallDir, 'studio', 'devstudio.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Red Hat JBoss Developer Studio ' + devstudioVersion + '" target="' + esc(path.join(devstudioInstallDir, 'studio', 'devstudio.exe')) + '" terminal="" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory="' + esc(path.join(devstudioInstallDir, 'studio')) + '"/>',
        '<shortcut KdeSubstUID="false" categories="" commandLine="-jar &quot;' + esc(path.join(devstudioInstallDir, 'Uninstaller', 'uninstaller.jar')) + '&quot;" createForAll="false" description="Uninstall Red Hat JBoss Developer Studio ' + devstudioVersion + '" encoding="" group="true" icon="' + esc(path.join(devstudioInstallDir, 'studio', 'uninstall.ico')) + '" iconIndex="0" initialState="1" mimetype="" name="Uninstall Red Hat JBoss Developer Studio ' + devstudioVersion + '" target="' + esc(path.join(jdkInstallDir, 'bin', 'javaw.exe')) + '" terminal="" terminalOptions="" tryexec="" type="1" url="" usertype="0" workingDirectory=""/>',
        '</com.izforge.izpack.panels.ShortcutPanel>',
        '<com.jboss.devstudio.core.installer.ShortcutPanelPatch id="shortcutpatch"/>',
        '<com.izforge.izpack.panels.SimpleFinishPanel id="finish"/>',
        '</AutomatedInstallation>'
      ].join('\r\n');
    return temp;
  }
}
export default DevstudioAutoInstallGenerator;
