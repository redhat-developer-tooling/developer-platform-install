'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallerDataService from 'browser/services/data';
import FusePlatformInstallKaraf from 'browser/model/jbossfusekaraf';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import EventEmitter from 'events';

chai.use(sinonChai);

describe('jbossplaformkaraf nstaller', function() {
  let sandbox;
  let fuseInstaller;
  let fakeProgress;
  let success;
  let failure;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fuseInstaller = new FusePlatformInstallKaraf(new InstallerDataService(), 'karaf', 'url', 'karaf.jar', 'sha256');
    fuseInstaller.ipcRenderer = new EventEmitter();
    sandbox.stub(mkdirp, 'sync').returns();
    fakeProgress = {
      setStatus: sandbox.stub(),
      setComplete: sandbox.stub()
    };
    success = sandbox.stub();
    failure = sandbox.stub();

  });

  afterEach(function() {
    sandbox.restore();
  });

  function createInstallerMock(installed) {
    let emitter = new EventEmitter();
    let pipe = function() {
      return emitter;
    };
    sandbox.stub(fs, 'createReadStream').returns({pipe});
    sandbox.stub(fs, 'createWriteStream').callsFake(function(arg) {
      return arg;
    });
    let entries = [
      {
        path: 'folder1/folder1',
        type: 'Directory',
        pipe: function() {},
        autodrain: function() {}

      }, {
        path: 'folder1/folder2/file1',
        type: 'File',
        pipe: function() {},
        autodrain: function() {}
      },
    ];
    sandbox.stub(fuseInstaller.installerDataSvc, 'fuseplatformkarafDir').returns('fusekaraf');
    sandbox.stub(fuseInstaller.installerDataSvc, 'getInstallable').returns({
      installed: installed,
      configureRuntimeDetection: sandbox.stub()
    });
    function emitEntries() {
      for(let entry of entries) {
        emitter.emit('entry', entry);
      }
      emitter.emit('close');
    }
    function emitError(error) {
      emitter.emit('error', error);
    }
    return {
      emitEntries,
      emitError
    };
  }

  describe('installAfterRequirements', function() {
    it('should remove first level folder when unpack direcories from zip archive', function() {
      let mockDevSuiteInstaller = createInstallerMock(true);
      let promise = fuseInstaller.installAfterRequirements(fakeProgress, success, failure);
      mockDevSuiteInstaller.emitEntries();
      return promise.then(()=>{
        expect(mkdirp.sync).calledOnce;
        expect(mkdirp.sync).calledWith(
          path.join(fuseInstaller.installerDataSvc.fuseplatformkarafDir(), 'folder1')
        );
      });
    });
    it('should remove first level folder when unpack files from zip archive', function() {
      let mockDevSuiteInstaller = createInstallerMock(false);
      let promise = fuseInstaller.installAfterRequirements(fakeProgress, success, failure);
      mockDevSuiteInstaller.emitEntries();
      return promise.then(()=>{
        expect(fs.createWriteStream).calledWith(
          path.join(fuseInstaller.installerDataSvc.fuseplatformkarafDir(), 'folder2', 'file1')
        );
      });
    });
    it('should configure runtime detection after devstudio installation finished', function() {
      let mockDevSuiteInstaller = createInstallerMock(false);
      let promise = fuseInstaller.installAfterRequirements(fakeProgress, success, failure);
      mockDevSuiteInstaller.emitEntries();
      return promise.then(()=>{
        let devstudioInstaller = fuseInstaller.installerDataSvc.getInstallable('fusetools');
        expect(devstudioInstaller.configureRuntimeDetection).not.called;
        fuseInstaller.ipcRenderer.emit('installComplete', 'installComplete', 'jdk');
        expect(devstudioInstaller.configureRuntimeDetection).not.called;
        fuseInstaller.ipcRenderer.emit('installComplete', 'installComplete', 'fusetools');
        expect(devstudioInstaller.configureRuntimeDetection).calledOnce;
      });
    });
    it('should return rejected promice if exception cought during unpacking', function() {
      let mockDevSuiteInstaller = createInstallerMock(false);
      mkdirp.sync.restore();
      sandbox.stub(mkdirp, 'sync').throws('Error');
      let promise = fuseInstaller.installAfterRequirements(fakeProgress, success, failure);
      mockDevSuiteInstaller.emitEntries();
      return promise.then(()=>{
        expect.fail();
      }).catch((error)=> {
        expect(error.name).equals('Error');
      });
    });
    it('should return rejected promise if unzip-stream emitted error', function() {
      let mockDevSuiteInstaller = createInstallerMock(false);
      let promise = fuseInstaller.installAfterRequirements(fakeProgress, success, failure);
      mockDevSuiteInstaller.emitError('Error');
      return promise.then(()=>{
        expect.fail();
      }).catch((error)=> {
        expect(error).equals('Error');
      });
    });
  });
});
