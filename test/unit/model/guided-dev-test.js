'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Platform from 'browser/services/platform';
import Installer from 'browser/model/helpers/installer';
import Utils from 'browser/model/helpers/util';
import InstallerDataService from 'browser/services/data';
import Downloader from 'browser/model/helpers/downloader';
import EclipseGuidedDevInstall from 'browser/model/guided-dev';
import fs from 'fs-extra';
import path from 'path';
import mkdirp from 'mkdirp';
import EventEmitter from 'events';

chai.use(sinonChai);

describe('guided development installer', function() {
  let installerDataSvc, sandbox, installer;
  let success, failure, fakeProgress, guidedDevInstall;
  let fakeInstallable, downloadUrl = 'https://developers.redhat.com/downloads';

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.rhamtDir.returns(path.join('install', 'rhmat'));
  installerDataSvc.jdkDir.returns(path.join('install', 'jdk8'));
  installerDataSvc.devstudioDir.returns(path.join('install','devstudio'));
  installerDataSvc.localAppData.restore();
  installerDataSvc.getRequirementByName.returns({
    name: 'guided-dev'
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(Platform, 'addToUserPath').resolves();
    fakeProgress = {
      setStatus: sandbox.stub(),
      setComplete: sandbox.stub()
    };
    success = sandbox.stub();
    failure = sandbox.stub();
    guidedDevInstall = new EclipseGuidedDevInstall('key', installerDataSvc, 'rhmat', downloadUrl, 'migrationtoolkit-rhamt-cli-4.0.0.offline.zip', 'sha256');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('installAfterRequirements', function() {

    beforeEach(function() {
      sandbox.stub(Installer.prototype, 'unzip').resolves();
      sandbox.stub(Installer.prototype, 'exec').resolves();
      sandbox.stub(fs, 'removeSync').returns();
      sandbox.stub(fs, 'ensureDirSync').returns();
      sandbox.stub(fs, 'copySync').returns();
      sandbox.stub(Utils, 'writeFile').resolves(true);
      sandbox.stub(Utils, 'replaceInFile').resolves(true);
    });

    it('should set progress to "Installing"', function() {
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(fakeProgress.setStatus).to.have.been.calledOnce;
        expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
      });
    });

    it('should call sucess callback if finished without errors', function() {
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(success).to.have.been.calledOnce;
      });
    });

    it('should call failure callback if installation failed', function() {
      Utils.writeFile.restore();
      sandbox.stub(Utils, 'writeFile').rejects();
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(failure).to.have.been.calledOnce;
      });
    });

    it('should create "cheatsheets" folder in devstudio location if it is missing', function() {
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(fs.ensureDirSync).to.have.been.calledOnce;
        expect(fs.ensureDirSync).to.have.been.calledWith(
          path.join('install', 'devstudio', 'cheatsheets'));
      });
    });

    it('should not create "cheatsheets" folder in devstudio location if it exists', function() {
      sandbox.stub(fs, 'existsSync').onFirstCall().returns(true).onSecondCall().returns(false);
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(fs.ensureDirSync).not.called;
      });
    });

    it('should write default content in cheatsheet xml file if missing', function() {
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(Utils.writeFile).to.have.been.calledOnce;
        expect(Utils.writeFile).to.have.been.calledWith(
          path.join('install','devstudio', 'cheatsheets', 'guided-development.xml'),
          guidedDevInstall.getDefaultCsContent());
      });
    });

    it('should not write default content in cheatsheet xml file if it exists', function() {
        sandbox.stub(fs, 'existsSync').onFirstCall().returns(true).onSecondCall().returns(true);
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(Utils.writeFile).to.not.have.been.calledOnce;
      });
    });

    it('should delete "cheatsheets" folder if exists for first guided development install', function() {
      EclipseGuidedDevInstall.firstCall = true;
      sandbox.stub(fs, 'existsSync').returns(true);
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(()=> {
        expect(fs.removeSync).to.have.been.calledWith(
          path.join(installerDataSvc.devstudioDir(), 'cheatsheets'));
      });
    });
  });
});
