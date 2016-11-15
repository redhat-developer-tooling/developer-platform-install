'use strict';

let remote = require('electron').remote;
let path = require('path');
let fs = require('fs-extra');
let shell = require('electron').shell;

import Logger from '../../services/logger';
import Util from '../../model/helpers/util';
import Platform from '../../services/platform';

class StartController {

  constructor(installerDataSvc) {
    this.startDevstudio = true;
    this.installerDataSvc = installerDataSvc;
    this.jbdsInstall = this.installerDataSvc.getInstallable('jbds');
    remote.getCurrentWindow().removeAllListeners('close');
    this.launchDevstudio = this['launchDevstudio_' + Platform.OS];
  }

  learnCDK() {
    shell.openExternal('http://developers.redhat.com/devstudio-preview');
  }

  start() {
    if(this.startDevstudio && (this.jbdsInstall.selected || this.jbdsInstall.existingInstall)) {
      // Start devstudio
      this.launchDevstudio();
    } else {
      this.exit();
    }
  }

  launchDevstudio_darwin() {
    let devStudioAppPath = path.join(this.installerDataSvc.jbdsDir(), 'Devstudio.app');
    let options = {
      env : Object.assign({},Platform.ENV)
    };
    options.env['rhel.subscription.password'] = this.installerDataSvc.password;
    Util.executeCommand(`open ${devStudioAppPath}`, 1, options).then(()=>{
      Logger.info('devstudio started sucessfully');
      this.exit();
    }).catch((error)=>{
      Logger.info(`devstudio start failed with error code '${error}'`);
      this.exit();
    });
  }

  launchDevstudio_win32() {
    Logger.info('devstudio Start - Write temp files...');
    let devstudioBat = path.join(this.jbdsInstall.selected ? this.installerDataSvc.jbdsDir()
        :  this.jbdsInstall.existingInstallLocation, 'devstudio.bat');

    let resetvarsBatFile = path.join(this.installerDataSvc.tempDir(), 'resetvars.bat');
    let resetvarsVbsFile = path.join(this.installerDataSvc.tempDir(), 'resetvars.vbs');
    let resetvarsVbsFileData = [
      'Set oShell = WScript.CreateObject("WScript.Shell")',
      'filename = oShell.ExpandEnvironmentStrings("' + resetvarsBatFile + '")',
      'Set objFileSystem = CreateObject("Scripting.fileSystemObject")',
      'Set oFile = objFileSystem.CreateTextFile(filename, TRUE)',

      'set oEnv=oShell.Environment("System")',
      'for each sitem in oEnv',
      'oFile.WriteLine("SET " & sitem)',
      'next',
      'path = oEnv("PATH")',

      'set oEnv=oShell.Environment("User")',
      'for each sitem in oEnv',
      'oFile.WriteLine("SET " & sitem)',
      'next',

      'path = path & ";" & oEnv("PATH")',
      'oFile.WriteLine("SET PATH=" & path)',
      'oFile.Close'
    ].join('\r\n');
    Logger.info('devstudio Start - Write resetvarsVbsFile: ' + resetvarsVbsFile);
    fs.writeFileSync(resetvarsVbsFile, resetvarsVbsFileData);
    Logger.info('devstudio Start - Write resetvarsVbsFile: ' + resetvarsVbsFile + ' - SUCCESS');

    let runJbdsFile = path.join(this.installerDataSvc.tempDir(), 'runjbds.bat');
    let runJbdsFileData = [
      '"' + resetvarsVbsFile + '"',
      'call "' + resetvarsBatFile + '"',
      'call "' + devstudioBat + '"'
    ].join('\r\n');
    Logger.info('devstudio Start - Write runJbdsFile: ' + runJbdsFile);
    fs.writeFileSync(runJbdsFile, runJbdsFileData);

    Logger.info('devstudio Start - Write runJbdsFile: ' + runJbdsFile + ' - SUCCESS');
    Logger.info('devstudio Start - Write temp file SUCCESS');
    Logger.info('devstudio Start - Run runJbdsFile: ' + runJbdsFile);

    let env = Platform.ENV;
    env['rhel.subscription.password'] = this.installerDataSvc.password;
    let runJbdsBat = require('child_process').spawn(
      'cmd.exe', ['/c',runJbdsFile], { env: env, timeout: 2000 });

    runJbdsBat.stdout.on('data',
      (data) => {
        Logger.info(`devstudio Start - [${runJbdsFile}]: ${data}`);
      });
    runJbdsBat.stderr.on('data',
      (data) => {
        Logger.info(`devstudio Start ERROR - [${runJbdsFile}]: ${data}`);
      });
    runJbdsBat.on('exit',
      (code) => {
        Logger.info(`devstudio Start Exit - Code: ${code}`);
        this.exit();
      });
  }

  exit() {
    Logger.info('Closing the installer window');
    remote.getCurrentWindow().close();
  }
}

StartController.$inject = ['installerDataSvc'];

export default StartController;
