'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import request from 'request';
import Downloader from 'browser/model/helpers/downloader';
import Logger from 'browser/services/logger';
import { Readable, PassThrough, Writable } from 'stream';
import Hash from 'browser/model/helpers/hash';
import fs from 'fs-extra';
import {ProgressState} from 'browser/pages/install/controller';
import mockfs from 'mock-fs';
chai.use(sinonChai);

describe('Downloader', function() {
  let downloader;
  let fakeProgress;
  let sandbox;
  let succ = function() {};
  let fail = function() {};
  let infoStub, errorStub, logStub;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    logStub = sinon.stub(Logger, 'log');
    mockfs();
  });

  after(function() {
    mockfs.restore();
    infoStub.restore();
    errorStub.restore();
    logStub.restore();
  });


  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeProgress = sinon.stub(new ProgressState());
    fakeProgress.$timeout = sinon.stub();
    downloader = new Downloader(fakeProgress, function() {}, function() {});
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should set totalDownloads to 1 by default', function() {
    expect(downloader.totalDownloads).to.equal(1);
  });

  it('dataHandler should update the progress once time threshold is reached', function() {
    fakeProgress.totalSize = 1024;

    let data = { length: 512 };

    downloader.received = 1;
    downloader.dataHandler('filename', data);

    expect(fakeProgress.setCurrent).to.have.been.calledOnce;
    expect(fakeProgress.setCurrent).to.have.been.calledWith(data.length);
  });

  it('dataHandler should not update the progress before time threshold is reached', function() {
    fakeProgress.totalSize = 1024;

    let data = { length: 512 };

    downloader.received = 1;
    downloader.lastTime = Date.now() + 9999999999;
    downloader.dataHandler('filename', data);

    expect(fakeProgress.setCurrent).not.called;
  });

  it('errorHandler should close the stream', function() {
    let errorSpy = sandbox.spy();
    let stream = { close: function() {} };
    let streamSpy = sandbox.spy(stream, 'close');

    downloader = new Downloader(fakeProgress, function() {}, errorSpy);
    downloader.errorHandler(stream, 'some error');

    expect(streamSpy).to.be.calledOnce;
    expect(errorSpy).to.be.calledOnce;
    expect(errorSpy).to.be.calledWith('some error');
  });

  it('endHandler should end the stream', function() {
    let stream = { end: function() {} };
    let streamSpy = sandbox.spy(stream, 'end');
    downloader.endHandler(stream);

    expect(streamSpy).to.be.calledOnce;
  });

  it('closeHandler should verify downloaded files checksum', function() {
    let stub = sandbox.stub(Hash.prototype, 'SHA256').resolves('hash');

    downloader.downloads.set('file', {options: 'options', sha: 'hash', 'failure': false});
    return downloader.closeHandler('file', 'hash').then(() => {
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith('file');
    });
  });

  it('closeHandler should set progress status to "Verifying Download" during SHA check if download is done', function () {
    sandbox.stub(Hash.prototype, 'SHA256').resolves('hash');
    fakeProgress.current = 100;

    downloader.downloads.set('file', {options: 'options', sha: 'hash', 'failure': false});
    return downloader.closeHandler('file', 'hash').then(() => {
      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Verifying Download');
    });
  });

  it('closeHandler should not set progress status to "Verifying Download" during SHA check if download is not done', function () {
    sandbox.stub(Hash.prototype, 'SHA256').resolves('hash');
    downloader.downloads.set('file', {options: 'options', sha: 'hash', 'failure': false});
    downloader.downloads.set('file2', {options: 'options', sha: 'hash', 'failure': false});

    return downloader.closeHandler('file', 'hash').then(() => {
      expect(fakeProgress.setStatus).to.have.not.been.called;
    });
  });

  it('closeHandler should call success when verification succeeds', function() {
    downloader = new Downloader(fakeProgress, succ, fail);
    sandbox.stub(Hash.prototype, 'SHA256').resolves('hash');
    let successSpy = sandbox.spy(downloader, 'success');
    let failureSpy = sandbox.spy(downloader, 'failure');

    downloader.downloads.set('file', {options: 'options', sha: 'hash', 'failure': false});
    downloader.closeHandler('file', 'hash').then(() => {
      expect(successSpy).to.have.been.calledOnce;
      expect(failureSpy).to.have.not.been.called;
    });
  });

  it('closeHandler should call failure when verification fails', function() {
    downloader = new Downloader(fakeProgress, succ, fail);
    downloader.downloads.set('file', {options: 'options', sha: 'sha', 'failure': false});
    sandbox.stub(Hash.prototype, 'SHA256').resolves('hash');
    let successSpy = sandbox.spy(downloader, 'success');
    let failureSpy = sandbox.spy(downloader, 'failure');

    downloader.closeHandler('file', 'hash1').then(() => {
      expect(failureSpy).to.have.been.calledOnce;
      expect(successSpy).to.have.not.been.called;
    });
  });

  describe('download', function() {
    let options = 'http://example.com/jdk.zip';
    let options2 = 'http://example.com/jdk1.zip';
    let options3 = {url:'http://example.com/jdk1.zip'};

    it('should make a request with given options', function() {
      let response = new PassThrough();
      let requestGetSpy = sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('end');
        });
        return response;
      });
      downloader.download(options3, 'jdk.zip').then(()=> {
        expect(requestGetSpy).to.be.calledOnce;
        expect(requestGetSpy).to.be.calledWith(options3);
      });
    });

    it('should make a request with given url in options', function() {
      let response = new PassThrough();
      let requestGetSpy = sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('end');
        });
        return response;
      });
      downloader.download(options, 'jdk.zip').then(()=> {
        expect(requestGetSpy).to.be.calledOnce;
        expect(requestGetSpy.args[0][0].hasOwnProperty('url')).to.be.true;
        expect(requestGetSpy.args[0][0].url).to.be.equal(options);
      });
    });

    it('should make a request with \'User-Agent\' header set', function() {
      let response = new PassThrough();
      let requestGetSpy = sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('end');
        });
        return response;
      });
      let d = downloader.download(options, 'jdk.zip');
      d.then(()=> {
        expect(requestGetSpy).to.be.calledOnce;
        expect(requestGetSpy.args[0][0].hasOwnProperty('headers')).to.be.true;
        expect(requestGetSpy.args[0][0].headers.hasOwnProperty('User-Agent')).to.be.true;
      });
    });

    it('should call endHandler when end event is emitted', function() {
      let response = new Readable();
      let stream = new PassThrough();
      response._read = function() {};
      sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('end');
          stream.emit('close');
        });
        return response;
      });


      sandbox.stub(fs, 'createWriteStream').returns(stream);
      let endHandler = sandbox.stub(downloader, 'endHandler');
      let d = downloader.download(options, 'jdk.zip');

      return d.then(()=> {
        expect(endHandler).to.be.calledOnce;
        expect(endHandler).to.be.calledWith(stream);
      });
    });

    it('should call errorHandler when error event is emitted and skip sucessHandler', function() {
      let response = new PassThrough();
      let error = new Error('something bad happened');

      sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('error', error);
        });
        return response;
      });

      let errorHandler = sandbox.stub(downloader, 'errorHandler');
      let successHandler = sandbox.stub(downloader, 'successHandler');
      let p = downloader.download(options, 'jdk.zip');

      return p.then(()=>{
        expect(errorHandler).to.be.calledOnce;
        expect(successHandler).to.have.not.been.called;
      }).catch((err)=>{
        expect.fail();
        return Promise.rejects(err);
      });
    });

    it('should save downloads in map', function() {
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);

      let stream = new Writable();
      stream.close = function() {};
      sandbox.spy(downloader, 'success');

      stream['path'] = 'file1';
      downloader.download(options, 'file1');
      expect(downloader.downloads.size).to.be.equal(1);

      stream['path'] = 'file2';
      downloader.download(options2, 'file2');
      expect(downloader.downloads.size).to.be.equal(2);
    });

    it('should call sucessHandler ony after all downloads are finished', function() {
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);

      let stream1 = new Writable();
      stream1.path = 'file1';
      stream1.close = function() {};
      downloader = new Downloader(fakeProgress, function() {}, function() {}, 2);
      let successHandler = sandbox.stub(downloader, 'success');
      downloader.download(options, 'file1');
      downloader.closeHandler('file1');
      let stream2 = new Writable();
      stream2.path = 'file1';
      stream2.close = function() {};
      downloader.download(options2, 'file2');
      downloader.closeHandler('file2');

      expect(successHandler).to.be.calledOnce;
    });
  });

  describe('restartDownload', function() {
    let options = 'http://example.com/jdk.zip';

    it('should change downloader status from \'Download Failed\' to \'Downloading\'', function() {
      downloader.restartDownload();
      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(downloader.currentSize).to.be.equal(0);
      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should call authDownload for entries that requires authentication', function() {

      let response = new PassThrough();
      let error = new Error('something bad happened');

      sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('error', error);
        });
        return response;
      });

      response.auth = sandbox.stub().callsFake(function() {
        return response;
      });

      let stream = new Writable();
      stream.close = function() {};
      stream.path = 'key';
      sandbox.stub(fs, 'createWriteStream').returns(stream);
      sandbox.stub(downloader, 'successHandler');
      let p = downloader.downloadAuth(options, 'username', 'password', 'key', 'sha');

      return p.then(()=>{
        sandbox.stub(downloader, 'downloadAuth');
        downloader.restartDownload();
        expect(downloader.downloadAuth).to.be.calledOnce;
        expect(downloader.downloadAuth).to.be.calledWith(options, 'username', 'password', 'key', 'sha');
      });
    });

    it('should call download method for entries that does not require authentication', function() {
      let response = new PassThrough();
      let error = new Error('something bad happened');

      sandbox.stub(request, 'get').callsFake(function() {
        // deffer error emmition
        Promise.resolve().then(function() {
          response.emit('error', error);
        });
        return response;
      });

      response.auth = sandbox.stub().callsFake(function() {
        return response;
      });

      let stream = new Writable();
      stream.close = function() {};
      stream.path = 'key';
      sandbox.stub(fs, 'createWriteStream').returns(stream);
      sandbox.stub(downloader, 'successHandler');
      let p = downloader.download(options, 'username', 'password', 'key', 'sha');

      return p.then(()=>{
        sandbox.stub(downloader, 'download');
        downloader.restartDownload();
        expect(downloader.download).to.be.calledOnce;
        expect(downloader.download).to.be.calledWith(options);
      });
    });

    it('should not call download method for not failed downloads', function() {
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);
      response.auth = function() { return response; };
      let stream = new Writable();
      stream.close = function() {};
      stream.path = 'key';
      downloader.download(options, 'file2');
      response.emit('end');
      response.emit('close');
      stream.close = function() {};
      sandbox.stub(fs, 'createWriteStream');
      sandbox.stub(downloader, 'download');
      downloader.restartDownload();
      expect(downloader.download.called).equals(false);
    });
  });

});
