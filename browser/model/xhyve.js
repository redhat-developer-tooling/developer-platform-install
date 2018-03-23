'use strict';

import InstallableItem from './installable-item';
import Platform from '../services/platform';

class XhyveInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl) {
    super(XhyveInstall.KEY, downloadUrl, '', '', installerDataSvc, false);
    this.selectedOption = 'detected';
  }

  static get KEY() {
    return 'xhyve';
  }

  detectExistingInstall() {
    if (Platform.OS == 'darwin') {
      return Platform.isxhyveAvailable().then((available) => {
        if(available) {
          this.addOption('detected', '', '', available);
        }
        this.selectedOption = 'detected';
      });
    } else {
      this.selectedOption = 'detected';
    }
    return Promise.resolve();
  }

  installAfterRequirements() {
    return Promise.resolve();
  }

  isConfigured() {
    return Platform.OS == 'darwin' && this.option.detected != undefined;
  }

  isSkipped() {
    if (Platform.OS === 'darwin') {
      return super.isSkipped();
    } else {
      return true;
    }
  }

  isDisabled() {
    return true;
  }
}

function fromJson({installerDataSvc, downloadUrl}) {
  return new XhyveInstall(installerDataSvc, downloadUrl);
}

XhyveInstall.convertor = {fromJson};

export default XhyveInstall;
