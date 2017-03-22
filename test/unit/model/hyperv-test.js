'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallerDataService from 'browser/services/data';
import Platform from 'browser/services/platform';
import HypervInstall from 'browser/model/hyperv';
import 'sinon-as-promised';
chai.use(sinonChai);

let child_process = require('child_process');

describe('Hyper-V Installer', function() {
  let sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });
  afterEach(function() {
    sandbox.restore();
  });
  describe('detectExistingInstall', function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });
      it('adds option \'detected\' if hypervisor detection script prints \'Enabled\' to stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        let hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(true);
        });
      });
      it('does not add option \'detected\' if hypervisor detection script fails', function() {
        sandbox.stub(child_process, 'exec').yields('Failure');
        let hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
      it('does not add option \'detected\' if hypervisor detection script prints \'Disabled\' to stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        let hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
      it('does not add option \'detected\' if hypervisor detection script prints nothing to stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        let hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
      it('does not add option \'detected\' if hypervisor detection script prints unexpected string to stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        let hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
    });
    describe('on macos', function() {
      let hvInstall;
      let hvInstallPromise;
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        hvInstallPromise = hvInstall.detectExistingInstall();
      });
      it('does not add option \'detected\'', function() {
        return hvInstallPromise.then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
      it('is marked as detected', function() {
        return hvInstallPromise.then(function() {
          expect(hvInstall.selectedOption).to.be.equal('detected');
        });
      });
    });
    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('does not add option \'detected\'', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        let hvInstall = new HypervInstall(new InstallerDataService(), 'url');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
    });
  });

});
