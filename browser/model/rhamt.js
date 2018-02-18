'use strict';

let fs = require('fs');
let path = require('path');
let mkdirp = require('mkdirp');
let unzip = require('unzip-stream');


import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Platform from '../services/platform';

class RhamtInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(RhamtInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.addOption('install', this.version, '', true);
    this.sha256 = sha256sum;
  }

  static get KEY() {
    return 'rhamt';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);
    return installer.unzip(this.downloadedFile, this.installerDataSvc.rhamtDir()).then(()=>{
      return Platform.makeFileExecutable(this.installerDataSvc.rhamtDir());
    }).then(()=> {
      if (Platform.OS === 'win32') {
        let rhamtcli = path.join(this.installerDataSvc.rhamtDir(), 'bin\\rhamt-cli.bat');
        fs.readFile(rhamtcli, 'utf8', function (err,data) {
          if (err) {
            return console.log(err);
          }
          let regeditdata = data.match(/FOR \/F "skip=2 tokens=2.*.B/g)
          let replacedata = data.replace(/FOR \/F "skip=2 tokens=2.*.B/, ' ');
          fs.writeFile(rhamtcli, replacedata, 'utf8', function (err) {
            if (err) return console.log(err);
          });
          var openJDK = 'REG QUERY "HKLM\\Software\\JavaSoft\\Java Runtime Environment\\1.8.0_161_1" /v JavaHome'
          let batfiledata = 'REG QUERY "HKLM\\Software\\JavaSoft\\Java Runtime Environment\\1.8.0_161_1" >nul 2>nul\nIF %errorlevel%==0 GOTO openJDK\nIF %errorlevel%==1 GOTO oracleJDK\n:openJDK\n'+'FOR /F "skip=2 tokens=2*" %%A IN'+' '+'(' +"'"+ openJDK + "'"+ ')'+' '+'DO set JAVA_HOME=%%B\n'+'if not "%JAVA_HOME%" == "" goto OkJHome\n'+':oracleJDK\n'+regeditdata[0]+'\n'+regeditdata[1];
          var result = replacedata.replace(/FOR \/F "skip=2 tokens=2.*.B/g, batfiledata);
          fs.writeFile(rhamtcli, result, 'utf8', function (err) {
            if (err) return console.log(err);
          });
        });
      }
      installer.succeed(true);
    }).catch((error)=> {
      installer.fail(error);
      return Promise.reject(error);
    });
  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new RhamtInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

RhamtInstall.convertor = {fromJson};

export default RhamtInstall;
