import { expect } from 'chai';
import * as tmp from 'tmp';
import * as fs from 'fs';
import rmdir from 'rimraf';

import { jdkInstall } from '../../src/main/jdk-install';

describe('JDK installer', function () {
  let jdkInstallationPath;

  before(function(done) {
    tmp.dir(function _tempDirCreated(err, path) {
      if (err) {
        done(err);
      } else {
        jdkInstallationPath = path;
        done();
      }
    });
  })

  describe('when extracting standard OpenJDK zip', function() {
    before(function(done) {
      jdkInstall(jdkInstallationPath, __dirname + '/fixtures/openjdk8-fake.zip', done);
    })

    it('should rename extracted directory to "jdk"', function() {
      expect(fs.existsSync(jdkInstallationPath + '/jdk')).to.be.true;
    });

    it('should remove orignal extracted directory', function() {
      expect(fs.existsSync(jdkInstallationPath + '/openjdk8-fake')).to.be.false;
    });

    it('directory should contain subdirectory "jdk/jre"', function() {
      expect(fs.existsSync(jdkInstallationPath + '/jdk/jre')).to.be.true;
    });

    it('directory should contain java executable', function() {
      expect(fs.existsSync(jdkInstallationPath + '/jdk/jre/bin/java.exe')).to.be.true;
    });

    it('should not allow to extract the zip second time', function(done) {
      jdkInstall(jdkInstallationPath, __dirname + '/fixtures/openjdk8-fake.zip', function(err) {
        if (err) {
          expect(err).to.not.be.empty;
          done();
        } else {
          done(new Error('function should fail'));
        }
      });
    });

    after(function(done) {
      rmdir(jdkInstallationPath + '/jdk', done);
    })
  });

  it('should fail when extracting non-standard zip', function(done) {
    jdkInstall(jdkInstallationPath, __dirname + '/fixtures/openjdk8-fake2.zip', function(err) {
      if (err) {
        expect(err).to.not.be.empty;
        expect(err).to.contain('openjdk');
        done();
      } else {
        done(new Error('function should fail'));
      }
    });
  });

  after(function(done) {
    rmdir(jdkInstallationPath, done);
  })
});
