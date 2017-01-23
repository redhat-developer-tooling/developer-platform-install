'use strict';
const child_process = require('child_process');
const pify = require('pify');

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
        return pify(child_process.exec)('powershell.exe -command "(GWMI Win32_Processor).VirtualizationFirmwareEnabled"').then((stdout)=>{
          let result = Promise.resolve();
          if(stdout) {
            stdout = stdout.replace(/\s/g, '');
            if(stdout == 'True') {
              result = Promise.resolve(true);
            } else if(stdout == 'False') {
              result = Promise.resolve(false);
            }
          }
          return result;
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
        return pify(child_process.exec)('PowerShell.exe -ExecutionPolicy Bypass -command "Get-WindowsOptionalFeature -Online | where FeatureName -eq Microsoft-Hyper-V-All | foreach{$_.state}"').then((stdout) => {
          let result = Promise.resolve();
          if(stdout) {
            stdout = stdout.replace(/\s/g, '');
            if(stdout == 'Enabled') {
              result = Promise.resolve(true);
            } else if(stdout == 'Disabled') {
              result = Promise.resolve(false);
            }
          }
          return result;
        });
      },
      default: function() {
        return Promise.resolve();
      }
    });
  }

  static addToUserPath(locations) {
    return Platform.identify({
      win32: ()=> Platform.addToUserPath_win32(locations),
      default: ()=> Promise.resolve()
    });
  }

  static removeFromUserPath(locations) {
    return Platform.identify({
      win32: ()=> Platform.removeFromUserPath_win32(locations),
      default: ()=> Promise.resolve()
    });
  }

  static getUserPath_win32() {
    return pify(child_process.exec)(
      'powershell.exe -executionpolicy bypass -command "[Environment]::GetEnvironmentVariable(\'path\', \'User\')"'
    ).then(result=> Promise.resolve(result.replace(/\r?\n/g, '')));
  }

  static setUserPath_win32(newPath) {
    return pify(child_process.exec)(
      `powershell.exe -executionpolicy bypass "[Environment]::SetEnvironmentVariable(\'Path\', \'${newPath}\', \'User\');[Environment]::Exit(0);"`
    );
  }

  static addToUserPath_win32(locations) {
    return Platform.getUserPath_win32().then((pathString)=>{
      let pathLocations = pathString.split(';');
      return Platform.setUserPath_win32([...locations.filter(item=>!pathLocations.includes(item)), pathString].join(';'));
    });
  }

  static removeFromUserPath_win32(locations) {
    return Platform.getUserPath_win32().then((pathString)=>{
      let pathLocations = pathString.split(';');
      return Platform.setUserPath_win32([...pathLocations.filter(item=>!locations.includes(item))].join(';'));
    });
  }
}

export default Platform;
