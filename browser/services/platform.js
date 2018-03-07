'use strict';

const child_process = require('child_process');
const pify = require('pify');
const path = require('path');
const fs = require('fs-extra');
import os from 'os';
import sudo from 'sudo-prompt';

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

  static getHypervAdminsGroupName() {
    return Platform.identify({
      win32: function() {
        return pify(child_process.exec)('powershell -ExecutionPolicy ByPass -command "(New-Object System.Security.Principal.SecurityIdentifier(\'S-1-5-32-578\')).Translate([System.Security.Principal.NTAccount]).Value;[Environment]::Exit(0);"').then((stdout)=>{
          return stdout ? stdout.trim().replace('BUILTIN\\', '') : '';
        }).catch(function() {});
      },
      default: function() {
        return Promise.resolve();
      }
    });
  }

  static getProgramFilesPath() {
    return Platform.identify({
      win32: function() {
        return Platform.ENV.PROGRAMFILES;
      }, darwin: function() {
        return '/Applications';
      }, default: function() {
        return Platform.getUserHomePath();
      }
    });
  }

  static isVirtualizationEnabled() {
    return Platform.identify({
      win32: function() {
        return pify(child_process.exec)('wmic cpu get virtualizationfirmwareenabled').then((stdout)=>{
          let result;
          if(stdout) {
            stdout = stdout.split('\n');
            stdout = stdout.length > 1 ? stdout[1].trim() : stdout[0];
            if(stdout == 'TRUE') {
              result = true;
            } else if(stdout == 'FALSE') {
              result = false;
            }
          }
          return result;
        }).catch(()=>{
          // Ignore errors
        });
      },
      darwin: function() {
        return pify(child_process.exec)('sysctl -a | grep -o VMX').then((stdout)=>{
          if(stdout) {
            return stdout.replace(/\s/g, '') == 'VMX';
          }
        }).catch(()=>{
          // ignore errors
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
        return pify(child_process.exec)('wmic datafile where name="c:\\\\windows\\\\system32\\\\vmms.exe" get version').then((stdout) => {
          let result = 'Unknown';
          if(stdout.trim()) {
            stdout = stdout.split('\n');
            stdout = stdout.length > 1 ? stdout[1] : stdout[0];
            if(stdout) {
              result = stdout;
            }
          }
          return result;
        }).catch(()=>{
          return 'Unknown';
        });
      },
      default: function() {
        return Promise.resolve('Unknown');
      }
    });
  }

  static isHypervisorEnabled() {
    return Platform.identify({
      win32: function() {
        return pify(child_process.exec)('net start').then((stdout) => {
          let result;
          if(stdout) {
            stdout = stdout.split('\n').map(x => x.trim());
            result = (stdout.indexOf('Hyper-V Host Compute Service') > -1)
              && (stdout.indexOf('Hyper-V Virtual Machine Management') > -1);
          }
          return result;
        }).catch(()=>{
        });
      },
      default: function() {
        return Promise.resolve(false);
      }
    });
  }

  static isHypervisorAvailable() {
    return Platform.identify({
      win32: function() {
        let winRegex = /.*Windows\s(10|8(\.1)?)\s(?!Home).+/;
        return pify(child_process.exec)('wmic os get caption').then((stdout) => {
          let result;
          if(stdout) {
            stdout = stdout.split('\n');
            stdout = stdout.length > 1 ? stdout[1] : stdout[0];
            result = winRegex.test(stdout) && (os.arch() === 'x64');
          }
          return result;
        }).catch(() => {});
      },
      default: function() {
        return Promise.resolve(false);
      }
    });
  }

  static getUserHomePath() {
    return Platform.identify({
      win32: ()=> {
        return Platform.ENV.USERPROFILE;
      },
      default: ()=> {
        return Platform.ENV.HOME;
      }
    });
  }

  static getFreeDiskSpace(location) {
    return Platform.identify({
      win32: ()=> {
        let disk = path.parse(location).root.charAt(0);
        return pify(child_process.exec)(`powershell -command "& {(Get-WMIObject Win32_Logicaldisk -filter deviceid='''${disk}:''').FreeSpace;[Environment]::Exit(0);}"`).then((stdout) => {
          return Number.parseInt(stdout);
        }).catch(()=>{
        });
      },
      darwin: ()=> {
        let path = location[0] === '/' ? '/' + location.split('/')[1] : location.split('/')[0];
        return pify(child_process.exec)(`df -k ${path}`).then((stdout) => {
          let lines = stdout.split('\n');
          let split = lines[1].replace( / +/g, ' ' ).split(' ');
          return Number.parseInt(split[split.length - 1] === '/' ? split[3] : split[4]);
        }).catch(()=>{
          return 'No such file or dir';
        });
      },
      default: ()=> Promise.resolve()
    });
  }

  static addToUserPath(locations, pathType = 'Machine') {
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
        return Platform.addToUserPath_win32(dirs, pathType);
      },
      darwin: ()=> Platform.addToUserPath_darwin(locations),
      default: ()=> Promise.resolve()
    });
  }

  static removeFromUserPath(locations, pathType = 'Machine') {
    return Platform.identify({
      win32: ()=> Platform.removeFromUserPath_win32(locations, pathType),
      default: ()=> Promise.resolve()
    });
  }

  static setUserPath(newPath, pathType = 'Machine') {
    return Platform.identify({
      win32: ()=> Platform.setUserPath_win32(newPath, pathType),
      default: ()=> Promise.resolve()
    });
  }

  static makeFileExecutable(file) {
    return Platform.identify({
      win32: ()=> {
        return Promise.resolve();
      },
      default: ()=> {
        return pify(child_process.exec)(`chmod +x '${file}'`);
      }
    });
  }

  /*
    Windows Platform Support
  */

  static getUserPath_win32(pathType) {
    return pify(child_process.exec)(
      `powershell.exe -executionpolicy bypass -command "[Environment]::GetEnvironmentVariable('path', '${pathType}');[Environment]::Exit(0);"`
    ).then(result=> result.replace(/\r?\n/g, ''));
  }

  static setUserPath_win32(newPath, pathType) {
    newPath = newPath.replace(/'/g, '\'\'');
    let powershellCommand = `powershell.exe -executionpolicy bypass "[Environment]::SetEnvironmentVariable('Path', '${newPath}', '${pathType}');[Environment]::Exit(0);"`
      .replace(/`/g, '``');
    return pify(child_process.exec)(powershellCommand);
  }

  static addToUserPath_win32(locations, pathType) {
    return Platform.getUserPath_win32(pathType).then((pathString)=>{
      let pathLocations = pathString.split(';');
      return Platform.setUserPath_win32([...locations.filter(item=>!pathLocations.includes(item)), pathString].join(';'), pathType);
    });
  }

  static removeFromUserPath_win32(locations, pathType) {
    return Platform.getUserPath_win32(pathType).then((pathString)=>{
      let pathLocations = pathString.split(';');
      return Platform.setUserPath_win32([...pathLocations.filter(item=>!locations.includes(item))].join(';'), pathType);
    });
  }

  /*
    macOS Platform Support
  */

  static addToUserPath_darwin(executables) {
    let commands = [];
    executables.forEach(function(executable) {
      let name = path.parse(executable).name;
      commands.push(`rm -f /usr/local/bin/${name};ln -s '${executable}' /usr/local/bin/${name};`);
    });
    return pify(sudo.exec)(commands.join(''), {name: 'Red Hat Development Suite', icns: path.resolve(__dirname + '/../../resources/devsuite.icns')});
  }

  static localAppData() {
    let appData = Platform.identify({
      win32: ()=> {
        let appDataPath = Platform.ENV.APPDATA;
        return appDataPath ? path.join(appDataPath, '..', 'Local', 'RedHat', 'DevSuite') : os.tmpdir();
      }, darwin: ()=> {
        let homePath = Platform.ENV.HOME;
        return homePath ? path.join(homePath, 'Library', 'Application Support', 'RedHat', 'DevSuite') : os.tmpdir();
      }, default: ()=> {
        return os.tmpdir();
      }
    });
    return path.resolve(appData);
  }
}

export default Platform;
