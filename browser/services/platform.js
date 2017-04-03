'use strict';

const child_process = require('child_process');
const pify = require('pify');
const path = require('path');
const fs = require('fs-extra');

class Platform {
  static identify(map) {
    if (map[Platform.OS]) {
      return map[Platform.OS]();
    }
    return map['default'] ? map['default']() : undefined;
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
        }).catch(()=>{
          return Promise.resolve();
        });
      },
      default: function() {
        return Promise.resolve(true);
      }
    });
  }

  static getHypervisorVersion() {
    return Platform.identify({
      win32: function() {
        return pify(child_process.exec)('powershell -ExecutionPolicy ByPass -command "(get-item c:\\windows\\system32\\vmms.exe).VersionInfo.ProductVersion"').then((stdout) => {
          let result = Promise.resolve();
          if(stdout) {
            stdout = stdout.replace(/\s/g, '');
            if(stdout) {
              result = Promise.resolve(stdout);
            } else {
              result = Promise.resolve('Unknown');
            }
          }
          return result;
        }).catch(()=>{
          return Promise.resolve('Unknown');
        });
      }
    });
  }

  static isHypervisorEnabled() {
    return Platform.identify({
      win32: function() {
        return pify(child_process.exec)('PowerShell.exe -ExecutionPolicy Bypass -command "Get-WindowsOptionalFeature -Online | where FeatureName -eq Microsoft-Hyper-V-Hypervisor | foreach{$_.state}"').then((stdout) => {
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
        }).catch(()=>{
          return Promise.resolve();
        });
      },
      default: function() {
        return Promise.resolve(false);
      }
    });
  }

  static getUserHomePath() {
    return Platform.identify({
      win32: ()=> {
        return Promise.resolve(process.env.USERPROFILE);
      },
      darwin: ()=> {
        return Promise.resolve(process.env.HOME);
      }
    });
  }

  static addToUserPath(locations) {
    return Platform.identify({
      win32: ()=> {
        let dirs = [];
        locations.forEach((location)=>{
          if(fs.statSync(location).isFile()) {
            dirs.push(path.parse(location).dir);
          } else {
            dirs.push(location);
          }
        });
        return Platform.addToUserPath_win32(dirs);
      },
      darwin: ()=> Platform.addToUserPath_darwin(locations),
      default: ()=> Promise.resolve()
    });
  }

  static removeFromUserPath(locations) {
    return Platform.identify({
      win32: ()=> Platform.removeFromUserPath_win32(locations),
      default: ()=> Promise.resolve()
    });
  }

  static setUserPath(newPath) {
    return Platform.identify({
      win32: ()=> Platform.setUserPath_win32(newPath),
      default: ()=> Promise.resolve()
    });
  }

  static makeFileExecutable(file) {
    return Platform.identify({
      win32: ()=> {
        return Promise.resolve();
      },
      default: ()=> {
        return pify(child_process.exec)(`chmod +x ${file}`);
      }
    });
  }

  /*
    Windows Platform Support
  */

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

  /*
    macOS Platform Support
  */

  static addToUserPath_darwin(executables) {
    let commands = [];
    executables.forEach(function(executable) {
      let name = path.parse(executable).name;
      commands.push(`rm -f /usr/local/bin/${name}; ln -s ${executable} /usr/local/bin/${name};`);
    });
    return pify(child_process.exec)(commands.join(' '));
  }

}

export default Platform;
