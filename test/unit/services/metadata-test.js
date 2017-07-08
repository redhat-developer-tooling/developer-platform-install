'use strict';

import chai, { expect } from 'chai';
import 'sinon';
import { default as sinonChai } from 'sinon-chai';
chai.use(sinonChai);
import loadMetadata from 'browser/services/metadata';

describe('Metadata', function() {
  describe('loadMetadata', function() {
    it('removes requirement that is not match the platform', function() {
      let req = {
        cdk: {
          'name': 'Red Hat Container Development Kit',
          'description': 'Developer Tools for Creating, Testing, and Distributing Red Hat Container-Based Applications',
          'vendor': 'Red Hat, Inc.',
          'modulePath': 'model/cdk',
          'targetFolderName': 'cdk',
          'platform': {
            'win32': {
              'bundle': 'yes',
              'dmUrl': 'https://developers.redhat.com/download-manager/jdf/file/cdk-3.0-minishift-windows-amd64.exe?workflow=direct',
              'url': 'http://cdk-builds.usersys.redhat.com/builds/weekly/09-May-2017.cdk-3.0.0/windows-amd64/minishift.exe',
              'filename': 'minishift_3_0_0_GA.exe',
              'sha256sum': '4f51b5b6bc8fc93bda5d25f5f58f213a8165b6c0e0f2b77dbb53ae6da4966068',
              'version': '3.0.0.GA'
            }
          }
        }
      };
      expect(loadMetadata(req, 'darwin').cdk).to.be.undefined;
    });
  });
});
