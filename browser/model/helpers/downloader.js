'use strict';

let request = require('request');
let fs = require('fs-extra');

import Hash from './hash';
import Logger from '../../services/logger';
import Util from './util';

class Downloader {
  constructor(progress, success, failure, totalDownloads = 1, userAgentString = 'unknown') {
    this.totalDownloads = totalDownloads;
    this.currentSize = 0;
    this.progress = progress;
    this.success = success;
    this.failure = failure;
    this.downloads = new Map();
    this.userAgentString = '';
    this.downloaded = 0;
    this.lastTime = 0;
    this.userAgentString = userAgentString;
    this.root = Promise.resolve();
  }

  errorHandler(stream, err) {
    stream.close();
    this.failure(err);
    if(!this.downloads.get(stream.path)) {
      this.downloads.set(stream.path, {failure: true, currentSize: 0});
    }
    this.currentSize -= this.downloads.get(stream.path).currentSize;
    this.progress.setCurrent(this.currentSize);
    this.downloads.get(stream.path).failure = true;
  }

  responseHandler(installer) {
    this.progress.productVersion = installer ? installer.productVersion : '';
    this.progress.setProductName(installer ? installer.productName : '');
  }

  dataHandler(file, data) {
    this.currentSize += data.length;
    let now = Date.now();
    if (now - this.lastTime > 500) {
      this.progress.setCurrent(this.currentSize);
      this.lastTime = now;
    }
    if(!this.downloads.get(file)) {
      this.downloads.set(file, {currentSize: 0});
    }
    this.downloads.get(file).currentSize += data.length;
  }

  endHandler(stream) {
    stream.end();
  }

  closeHandler(file, sha) {
    this.closePromise = Promise.resolve();
    if(this.downloads.get(file) && this.downloads.get(file)['failure']) {
      return;
    }
    if(sha) {
      let remainingCount = 0;
      this.downloads.forEach((value) => {
        if (!value.done) { remainingCount++; }
      });
      let total = this.progress.totalAmount;
      this.checkAmount = this.checkAmount ? this.checkAmount++ : 1;

      Logger.log(`Configured file='${file}' sha256='${sha}'`);
      var h = new Hash();
      if(this.checkAmount === remainingCount) {
        this.progress.setStatus('Verifying Download');
        this.progress.setTotalAmount(remainingCount);
        this.progress.setCurrent(this.checkAmount);
      }
      return this.closePromise = this.closePromise.then(() => {
        return h.SHA256(file).then((dlSha) => {
          if(sha === dlSha) {
            Logger.log(`Downloaded file='${file}' sha256='${dlSha}'`);
            this.successHandler(file);
          } else {
            if(this.downloads.get(file)) {
              this.downloads.get(file)['failure'] = true;
              this.currentSize -= this.downloads.get(file).currentSize;
              this.progress.setTotalAmount(total)
              this.progress.setCurrent(this.currentSize);
              this.progress.resetTime();
            }
            this.failure('SHA256 checksum verification failed');
          }
          this.checkAmount--;
        });
      });
    } else {
      this.successHandler(file);
    }
  }

  successHandler(file) {
    if(this.downloads.get(file)) {
      this.downloads.get(file)['failure'] = false;
      this.downloads.get(file)['done'] = true;
    }
    if(this.totalDownloads == ++this.downloaded || this.totalDownloads == 0) {
      this.success();
    }
  }

  download(options, file, sha, installer) {
    let stream = fs.createWriteStream(file);
    this.downloads.set(stream.path, {installer, options, sha, 'failure': false, currentSize : 0});
    this.root = this.root.then(() => {
      return new Promise((resolve)=>{
        request.get(this.setAdditionalOptions(options))
          .on('error', this.errorHandler.bind(this, stream))
          .on('error', resolve)
          .on('response', this.responseHandler.bind(this, installer))
          .on('data', this.dataHandler.bind(this, file))
          .on('end', this.endHandler.bind(this, stream))
          .pipe(stream)
          .on('close', this.closeHandler.bind(this, stream.path, sha, options))
          .on('close', resolve);
      });
    });
    return this.root;
  }

  downloadAuth(options, username, password, file, sha, installer) {
    let stream = fs.createWriteStream(file);
    this.downloads.set(stream.path, {installer, options, username, password, sha, 'failure': false, currentSize : 0});
    this.root = this.root.then(() => {
      return new Promise((resolve)=>{
        request.get(this.setAdditionalOptions(options))
          .auth(username, password)
          .on('error', this.errorHandler.bind(this, stream))
          .on('error', resolve)
          .on('response', this.responseHandler.bind(this, installer))
          .on('data', this.dataHandler.bind(this, file))
          .on('end', this.endHandler.bind(this, stream))
          .pipe(stream)
          .on('close', this.closeHandler.bind(this, stream.path, sha, options))
          .on('close', resolve);
      });
    });
    return this.root;
  }

  restartDownload() {
    this.progress.setStatus('Downloading');
    for (var [key, value] of this.downloads.entries()) {
      if (value['failure'] && value.failure) {
        if(value.hasOwnProperty('username')) {
          this.downloadAuth(value.options, value.username, value.password, key, value.sha, value.installer);
        } else {
          this.download(value.options, key, value.sha, value.installer);
        }
      }
    }
    return this.root;
  }

  setAdditionalOptions(options) {
    let optionsObj;
    if (options instanceof Object) {
      optionsObj = options;
    } else {
      optionsObj = {
        url: options,
      };
    }
    optionsObj['headers'] = {
      'User-Agent': this.userAgentString
    };
    optionsObj['followAllRedirects'] = true;
    optionsObj['jar'] = request.jar();
    optionsObj['rejectUnauthorized'] = Util.getRejectUnauthorized();
    optionsObj.timeout = 60000;
    return optionsObj;
  }
}

export default Downloader;
