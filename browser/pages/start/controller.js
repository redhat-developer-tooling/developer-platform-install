'use strict';

let remote = require('remote');
let path = require('path');
let fs = require('fs-extra');
let shell = require('electron').shell;

import Logger from '../../services/logger';

class StartController {

  constructor(installerDataSvc) {
    this.startJBDS = true;
    this.installerDataSvc = installerDataSvc;
    this.jbdsInstall = this.installerDataSvc.getInstallable('jbds');
  }

  learnCDK() {
    shell.openExternal('http://developers.redhat.com/products/cdk/get-started/');
  }

  start() {
    if(this.startJBDS && (this.jbdsInstall.selected || this.jbdsInstall.existingInstall)) {
      // Start JBDS
      this.launchJBDS();
    } else {
      this.exit();
    }
  }

  launchJBDS() {
    Logger.info('JBDS Start - Write temp files...');
    let jbdevstudioBat = path.join(this.jbdsInstall.selected ? this.installerDataSvc.jbdsDir()
        :  this.jbdsInstall.existingInstallLocation, 'jbdevstudio.bat');

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
    Logger.info('JBDS Start - Write resetvarsVbsFile: ' + resetvarsVbsFile);
    fs.writeFileSync(resetvarsVbsFile, resetvarsVbsFileData);
    Logger.info('JBDS Start - Write resetvarsVbsFile: ' + resetvarsVbsFile + ' - SUCCESS');

    let runJbdsFile = path.join(this.installerDataSvc.tempDir(), 'runjbds.bat');
    let runJbdsFileData = [
        '"' + resetvarsVbsFile + '"',
        'call "' + resetvarsBatFile + '"',
        'call "' + jbdevstudioBat + '"'
    ].join('\r\n');
    Logger.info('JBDS Start - Write runJbdsFile: ' + runJbdsFile);
    fs.writeFileSync(runJbdsFile, runJbdsFileData);
    Logger.info('JBDS Start - Write runJbdsFile: ' + runJbdsFile + ' - SUCCESS');

    Logger.info('JBDS Start - Write temp file SUCCESS');

    Logger.info('JBDS Start - Run runJbdsFile: ' + runJbdsFile);
    let runJbdsBat = require('child_process')
        .spawn(
            'cmd.exe',
            [
                '/c',
                runJbdsFile
            ],
            {
                timeout: 2000,
            });
    runJbdsBat.stdout.on('data',
                (data) => {
                    Logger.info("JBDS Start - [" + runJbdsFile + "]: " + data);
                });
    runJbdsBat.stderr.on('data',
                (data) => {
                    Logger.info("JBDS Start ERROR - [" + runJbdsFile + "]: " + data);
                });
    runJbdsBat.on('exit',
                (code) => {
                    Logger.info("JBDS Start Exit - Code: " + code);
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
