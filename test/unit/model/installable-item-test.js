'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs';
import path from 'path';
import InstallableItem from 'browser/model/installable-item';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import child_process from 'child_process';
import InstallerDataService from 'browser/services/data';

chai.use(sinonChai);

describe('Installable Item', function() {

  it('should return passed parameter for thenInstall call', function() {
    let svc = new InstallerDataService();
    let item1 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
    let item2 = new InstallableItem('cygwin', 1000, 'url', 'installFile', 'targetFolderName', svc);
    item1.thenInstall(item2);
    expect(item2.installAfter).to.be.equal(item1);
    expect(item2.getInstallAfter()).to.be.equal(item1);
  });


  it('should ignore skipped installers and return first selected for installation', function() {
    let svc = new InstallerDataService();
    let item1 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
    let item2 = new InstallableItem('cygwin', 1000, 'url', 'installFile', 'targetFolderName', svc);
    item2.selectedOption = 'detected';
    let item3 = new InstallableItem('jbds', 1000, 'url', 'installFile', 'targetFolderName', svc);
    item3.selectedOption = 'detected';
    let item4 = new InstallableItem('cdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
    svc.addItemsToInstall(item1,item2,item3,item4);
    item1.thenInstall(item2).thenInstall(item3).thenInstall(item4);
    expect(item4.getInstallAfter()).to.be.equal(item1);
  });
});
