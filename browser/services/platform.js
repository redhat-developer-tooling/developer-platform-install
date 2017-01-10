'use strict';

class Platform {
  static identify(map) {
    try {
      return map[Platform.OS]();
    } catch (error) {
      let defaultCallback = map['default'];
      return defaultCallback ? defaultCallback() : undefined;
    }
  }

  static get OS() {
    return Platform.getOS();
  }

  static getOS() {
    return process.platform;
  }

  static get ENV() {
    return Platform.getEnv();
  }

  static getEnv() {
    return process.env;
  }

  static get PATH() {
    return Platform.identify({
      win32: ()=>'Path',
      default: ()=>'PATH'
    });
  }

  static isVirtualizationEnabled() {
    return Platform.identify({
      win32: function() {
        // put implementation here based on child_process.spawn method
        // run systeminfo command and analyse stdout
        // you should look for 'Virtualization Enabled In Firmware: Yes' line
        // in output and if value is Yes resolve promise to true or false otherwise
        // if output has no Virtualization Enabled In Firmware return undefined
        // do not forget tests for platform-test.js
        return Promise.resolve(undefined);
      },
      default: function() {
        return Promise.resolve(undefined);
      }
    });
  }

  static isHypervisorEnabled() {
    return Platform.identify({
      win32: function() {
        // put implementation here based on child_process.spawn method
        // run powershell command explained here
        // https://issues.jboss.org/browse/JBDS-3869?focusedCommentId=13345706&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-13345706
        // for Disabled return false
        // for Enabled return true
        // for empty string undefined
        return Promise.resolve(undefined);
      },
      default: function() {
        return Promise.resolve(undefined);
      }
    });
  }
}

export default Platform;
