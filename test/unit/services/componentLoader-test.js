'use strict';

import 'chai';
import { expect } from 'chai';
import InstallerDataService from 'browser/services/data';
import ComponentLoader from 'browser/services/componentLoader';

describe('Component Loader', function() {
  let svc, loader;
  let reqs = {
    'cdk': {
      name: 'cdk',
      modulePath: 'model/cdk',
      targetFolderName: 'cdkFolder',
      bundle: 'yes',
      dmUrl: 'cdkDmUrl',
      url: 'cdkUrl',
      fileName: 'minishift.exe',
      sha256sum: 'cdkSHA',
      version: '3.0.0.GA'
    },
    'jdk': {
      name: 'jdk',
      modulePath: 'model/jdk-install',
      targetFolderName: 'jdkFolder',
      bundle: 'yes',
      dmUrl: 'jdkDmUrl',
      url: 'jdkUrl',
      fileName: 'jdk.msi',
      sha256sum: 'jdkSHA',
      version: '1.8.0'
    },
    'devstudio': {
      name: 'devstudio',
      modulePath: 'model/devstudio',
      targetFolderName: 'devstudioFolder',
      bundle: 'yes',
      url: 'devstudioUrl',
      dmUrl: 'devstudioDmUrl',
      fileName: 'devstudio.jar',
      sha256sum: 'devstudioSHA',
      version: '10.4.0'
    },
    'fusetools': {
      name: 'fusetools',
      modulePath: 'model/devstudio',
      targetFolderName: 'devstudioFolder',
      bundle: 'yes',
      url: 'devstudioUrl',
      dmUrl: 'devstudioDmUrl',
      fileName: 'devstudio.jar',
      sha256sum: 'devstudioSHA',
      version: '10.4.0'
    },
    'cygwin': {
      name: 'cygwin',
      modulePath: 'model/cygwin',
      targetFolderName: 'cygwinFolder',
      bundle: 'always',
      url: 'cygwinUrl',
      fileName: 'cygwin.exe',
      sha256sum: 'cygwinSHA',
      version: '2.7.0'
    },
    'virtualbox': {
      name: 'virtualbox',
      modulePath: 'model/virtualbox',
      targetFolderName: 'virtualboxFolder',
      bundle: 'no',
      url: 'virtualboxUrl',
      fileName: 'virtualbox.exe',
      sha256sum: 'virtualboxSHA',
      version: '5.1.12'
    },
    '7zip': {
      name: '7zip',
      bundle: 'tools',
      url: '7zipUrl',
      fileName: '7zip.exe',
      sha256sum: '7zipSHA',
      version: '1.0.0'
    }
  };
  let reducedReqs = {};
  let reducedReqs2 = {};
  Object.assign(reducedReqs, reqs);
  Object.assign(reducedReqs2, reqs);
  delete reducedReqs.jdk;
  delete reducedReqs2.cygwin;

  describe('addComponent', function() {

    beforeEach(function() {
      svc = new InstallerDataService({}, reqs);
      loader = new ComponentLoader(svc);
    });

    it('should add a non-tool component', function() {
      loader.addComponent('cdk');
      expect(svc.getInstallable('cdk')).to.not.equal(undefined);
    });

    it('should not add a tool component', function() {
      loader.addComponent('7zip');
      expect(svc.getInstallable('7zip')).to.equal(undefined);
    });

    it('should ignore url property when dmUrl is present', function() {
      loader.addComponent('cdk');
      expect(svc.getInstallable('cdk').downloadUrl).to.equal('cdkDmUrl');
    });

    it('should create the component with the appropriate properties', function() {
      loader.addComponent('cdk');
      let cdk = svc.getInstallable('cdk');

      expect(cdk.keyName).to.equal('cdk');
      expect(cdk.targetFolderName).to.equal('cdkFolder');
      expect(cdk.downloadUrl).to.equal('cdkDmUrl');
      expect(cdk.bundledFile).to.contain('minishift.exe');
      expect(cdk.sha256).to.equal('cdkSHA');
    });
  });

  describe('orderInstallation', function() {
    it('should respect the default order if no component is missing', function() {
      svc = new InstallerDataService({}, reqs);
      loader = new ComponentLoader(svc);
      addAll(loader, reqs);
      loader.orderInstallation();

      expect(svc.getInstallable('jdk').installAfter).to.equal(undefined);
      expect(svc.getInstallable('devstudio').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('virtualbox').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('cygwin').installAfter.keyName).to.equal('virtualbox');
      expect(svc.getInstallable('cdk').installAfter.keyName).to.equal('cygwin');
    });

    it('if the first component in sequence is not present, its children should take its place', function() {
      svc = new InstallerDataService({}, reducedReqs);
      loader = new ComponentLoader(svc);
      addAll(loader, reducedReqs);
      loader.orderInstallation();

      expect(svc.getInstallable('jdk')).to.equal(undefined);
      expect(svc.getInstallable('devstudio').installAfter).to.equal(undefined);
      expect(svc.getInstallable('virtualbox').installAfter).to.equal(undefined);
      expect(svc.getInstallable('cygwin').installAfter.keyName).to.equal('virtualbox');
      expect(svc.getInstallable('cdk').installAfter.keyName).to.equal('cygwin');
    });

    it('should squash the install sequence if some component not present', function() {
      svc = new InstallerDataService({}, reducedReqs2);
      loader = new ComponentLoader(svc);
      addAll(loader, reducedReqs2);
      loader.orderInstallation();

      expect(svc.getInstallable('jdk').installAfter).to.equal(undefined);
      expect(svc.getInstallable('devstudio').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('virtualbox').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('cygwin')).to.equal(undefined);
      expect(svc.getInstallable('cdk').installAfter.keyName).to.equal('virtualbox');
    });
  });

  describe('removeComponent', function() {
    beforeEach(function() {
      svc = new InstallerDataService({}, reqs);
      loader = new ComponentLoader(svc);
      addAll(loader, reqs);
      loader.orderInstallation();
    });

    it('should delete the appropriate component', function() {
      loader.removeComponent('cdk');
      expect(svc.getInstallable('cdk')).to.be.undefined;
    });

    it('should purge the planned installation/download of the component', function() {
      loader.removeComponent('cdk');
      expect(svc.toDownload.has('cdk')).to.be.false;
      expect(svc.toInstall.has('cdk')).to.be.false;
    });

    it('should rearange the installation sequence', function() {
      loader.removeComponent('cygwin');

      expect(svc.getInstallable('jdk').installAfter).to.equal(undefined);
      expect(svc.getInstallable('devstudio').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('virtualbox').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('cygwin')).to.equal(undefined);
      expect(svc.getInstallable('cdk').installAfter.keyName).to.equal('virtualbox');
    });
  });

  describe('loadComponent', function() {
    beforeEach(function() {
      svc = new InstallerDataService({}, reqs);
      loader = new ComponentLoader(svc);
      addAll(loader, reducedReqs);
      loader.orderInstallation();
    });

    it('should add the specified component', function() {
      loader.loadComponent('jdk');
      expect(svc.getInstallable('jdk')).to.not.equal(undefined);
    });

    it('should rearange the installation sequence', function() {
      loader.loadComponent('jdk');

      expect(svc.getInstallable('jdk').installAfter).to.equal(undefined);
      expect(svc.getInstallable('devstudio').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('virtualbox').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('cygwin').installAfter.keyName).to.equal('virtualbox');
      expect(svc.getInstallable('cdk').installAfter.keyName).to.equal('cygwin');
    });
  });

  describe('loadComponents', function() {
    beforeEach(function() {
      svc = new InstallerDataService({}, reqs);
      loader = new ComponentLoader(svc);
    });

    it('should add all the components from the requirements', function() {
      loader.loadComponents();

      expect(svc.getInstallable('jdk')).to.not.equal(undefined);
      expect(svc.getInstallable('devstudio')).to.not.equal(undefined);
      expect(svc.getInstallable('virtualbox')).to.not.equal(undefined);
      expect(svc.getInstallable('cygwin')).to.not.equal(undefined);
      expect(svc.getInstallable('cdk')).to.not.equal(undefined);
    });

    it('should order the installation sequence', function() {
      loader.loadComponents();

      expect(svc.getInstallable('jdk').installAfter).to.equal(undefined);
      expect(svc.getInstallable('devstudio').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('virtualbox').installAfter.keyName).to.equal('jdk');
      expect(svc.getInstallable('cygwin').installAfter.keyName).to.equal('virtualbox');
      expect(svc.getInstallable('cdk').installAfter.keyName).to.equal('cygwin');
    });
  });
});

function addAll(loader, requirements) {
  for (let key in requirements) {
    loader.addComponent(key);
  }
}
