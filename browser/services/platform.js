'use strict';

const child_process = require('child_process');

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
        return new Promise( function(resolve, reject) {
          child_process.exec('powershell.exe -command "(GWMI Win32_Processor).VirtualizationFirmwareEnabled"', (error, stdout, stderr) => {
            if(typeof(stdout) == "string") {
              stdout = stdout.replace(/\s/g,"");
              if(stdout == "True") {
                resolve(true);
              } else if(stdout == "False") {
                resolve(false);
              } else {
                resolve();
              }
            } else {
              resolve();
            }
          });
        });
      },
      default: function() {
        return Promise.resolve();
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
