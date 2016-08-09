'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import request from 'request';
import Downloader from 'model/helpers/downloader';
import { Readable, PassThrough, Writable } from 'stream';
import Hash from 'model/helpers/hash';
chai.use(sinonChai);

describe('Downloader', function() {
  let downloader;
  let fakeProgress = {
    setStatus: function (desc) { return; },
    setCurrent: function (val) {},
    setLabel: function (label) {},
    setComplete: function() {},
    setTotalDownloadSize: function(size) {},
    downloaded: function(amt, time) {}
  };
  let sandbox;
  let succ = function() {};
  let fail = function() {};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  })

  it('should set totalDownloads to 1 by default', function() {
    downloader = new Downloader(fakeProgress, function() {}, function() {});
    expect(downloader.totalDownloads).to.equal(1);
  });

  it('responseHandler should set the total download size', function() {
    downloader = new Downloader(fakeProgress, function() {}, function() {});
    let response = { headers: { 'content-length': 1024 } };
    let spy = sandbox.spy(fakeProgress, 'setTotalDownloadSize');

    downloader.responseHandler(response);

    expect(downloader.downloadSize).to.equal(1024);
    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(1024);
  });

  it('dataHandler should update the progress', function() {
    downloader = new Downloader(fakeProgress, function() {}, function() {});
    let data = { length: 1024 };
    let spy = sandbox.spy(fakeProgress, 'downloaded');

    downloader.dataHandler(data);

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(1024);
  });

  it('errorHandler should close the stream', function() {
    let errorSpy = sandbox.spy();
    let stream = { close: function() {} };
    let streamSpy = sandbox.spy(stream, 'close');

    downloader = new Downloader(fakeProgress, function() {}, errorSpy);
    downloader.setWriteStream(stream);
    downloader.errorHandler(stream, 'some error');

    expect(streamSpy).to.be.calledOnce;
    expect(errorSpy).to.be.calledOnce;
    expect(errorSpy).to.be.calledWith('some error');
  });

  it('endHandler should end the stream', function() {
    let stream = { end: function() {} };
    let streamSpy = sandbox.spy(stream, 'end');

    downloader = new Downloader(fakeProgress, function() {}, function() {});
    downloader.setWriteStream(stream);
    downloader.endHandler(stream);

    expect(streamSpy).to.be.calledOnce;
  });

  it('closeHandler should verify downloaded files checksum', function() {
    downloader = new Downloader(fakeProgress, function() {}, function() {});
    let stub = sandbox.stub(Hash.prototype, 'SHA256').yields('hash');

    downloader.closeHandler('file', 'hash');

    expect(stub).to.have.been.calledOnce;
    expect(stub).to.have.been.calledWith('file');
  });

  it('closeHandler should call success when verification succeeds', function() {
    downloader = new Downloader(fakeProgress, succ, fail);
    let stub = sandbox.stub(Hash.prototype, 'SHA256').yields('hash');
    let successSpy = sandbox.spy(downloader, 'success');
    let failureSpy = sandbox.spy(downloader, 'failure');

    downloader.closeHandler('file', 'hash');

    expect(successSpy).to.have.been.calledOnce;
    expect(failureSpy).to.have.not.been.called;
  });

  it('closeHandler should call failure when verification fails', function() {
    downloader = new Downloader(fakeProgress, succ, fail);
    let stub = sandbox.stub(Hash.prototype, 'SHA256').yields('hash');
    let successSpy = sandbox.spy(downloader, 'success');
    let failureSpy = sandbox.spy(downloader, 'failure');

    downloader.closeHandler('file', 'hash1');

    expect(failureSpy).to.have.been.calledOnce;
    expect(successSpy).to.have.not.been.called;
  });

  describe('download', function() {
    let options = 'http://example.com/jdk.zip';
    let options2 = 'http://example.com/jdk1.zip';
    let options3 = {url:'http://example.com/jdk1.zip'};

    it('should make a request with given options', function() {
      let requestGetSpy = sandbox.spy(request, 'get');
      downloader = new Downloader(fakeProgress, function() {}, function() {});
      downloader.setWriteStream(new PassThrough());
      downloader.download(options3);

      expect(requestGetSpy).to.be.calledOnce;
      expect(requestGetSpy).to.be.calledWith(options3);
    });

    it('should make a request with given url in options', function() {
      let requestGetSpy = sandbox.spy(request, 'get');
      downloader = new Downloader(fakeProgress, function() {}, function() {});
      downloader.setWriteStream(new PassThrough());
      downloader.download(options);

      expect(requestGetSpy).to.be.calledOnce;
      expect(requestGetSpy.args[0][0].hasOwnProperty('url')).to.be.true;
      expect(requestGetSpy.args[0][0].url).to.be.equal(options);
    });

    it('should make a request with \'User-Agent\' header set', function() {
      let requestGetSpy = sandbox.spy(request, 'get');
      downloader = new Downloader(fakeProgress, function() {}, function() {});
      downloader.setWriteStream(new PassThrough());
      downloader.download(options);

      expect(requestGetSpy).to.be.calledOnce;
      expect(requestGetSpy.args[0][0].hasOwnProperty('headers')).to.be.true;
      expect(requestGetSpy.args[0][0].headers.hasOwnProperty('User-Agent')).to.be.true;

    });

    it('should call endHandler when end event is emitted', function() {
      let response = new Readable();
      response._read = function(size) {};
      sandbox.stub(request, 'get').returns(response);

      let stream = new PassThrough();
      downloader = new Downloader(fakeProgress, function() {}, function() {});
      downloader.setWriteStream(stream);
      let endHandler = sandbox.stub(downloader, 'endHandler');
      downloader.download(options);
      response.emit('end');

      expect(endHandler).to.be.calledOnce;
      expect(endHandler).to.be.calledWith(stream);
    });

    it('should call errorHandler when error event is emitted', function() {
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);
      let error = new Error('something bad happened');

      let stream = new Writable();
      downloader = new Downloader(fakeProgress, function() {}, function() {});
      downloader.setWriteStream(stream);
      let errorHandler = sandbox.stub(downloader, 'errorHandler');
      downloader.download(options);
      response.emit('error', error);

      expect(errorHandler).to.be.calledOnce;
      expect(errorHandler).to.be.calledWith(stream, error);
    });

    it('should save downloads in map', function(){
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);

      let stream = new Writable();

      downloader = new Downloader(fakeProgress, function() {}, function() {});
      downloader.setWriteStream(stream);
      let successSpy = sandbox.spy(downloader, 'success');

      stream['path'] = 'file1';
      downloader.download(options,'file1');
      expect(downloader.downloads.size).to.be.equal(1);

      stream['path'] = 'file2';
      downloader.download(options2,'file2');
      expect(downloader.downloads.size).to.be.equal(2);
    });

    it('should not call sucessHandler after error event is emitted',function(){
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);
      let error = new Error('something bad happened');

      let stream = new Writable();
      downloader = new Downloader(fakeProgress, function() {}, function() {}, 1, 2);
      downloader.setWriteStream(stream);
      let errorHandler = sandbox.stub(downloader, 'errorHandler');
      let successSpy = sandbox.spy(downloader, 'success');
      downloader.download(options);
      response.emit('error', error);
      downloader.download(options2,"file1");
      downloader.closeHandler('file1');

      expect(errorHandler).to.be.calledOnce;
      expect(successSpy).to.have.not.been.called;
    });

    it('should call sucessHandler ony after all downloads are finished',function(){
      let response = new Readable();
      sandbox.stub(request, 'get').returns(response);
      let error = new Error('something bad happened');

      let stream = new Writable();
      downloader = new Downloader(fakeProgress, function() {}, function() {}, 1, 2);
      downloader.setWriteStream(stream);
      let successHandler = sandbox.stub(downloader, 'success');
      downloader.download(options);
      downloader.closeHandler('file1');
      downloader.download(options2);
      downloader.closeHandler('file2');

      expect(successHandler).to.be.calledOnce;
    });
  });
});
