'use strict';

let request = require('request');
let fs = require('fs-extra');

import Path from 'path';
import Hash from './hash';
import Logger from '../../services/logger';
import Util from './util';
const remote = require('electron').remote;

class Downloader {
  constructor(progress, success, failure, totalDownloads = 1) {
    this.downloadSize = 0;
    this.totalDownloads = totalDownloads;
    this.currentSize = 0;
    this.progress = progress;
    this.success = success;
    this.failure = failure;
    this.downloads = new Map();
    this.userAgentString = '';
    this.received = 0;
    this.downloaded = 0;
    this.lastTime = 0;
    if(remote) {
      this.userAgentString = remote.getCurrentWindow().webContents.session.getUserAgent();
    }
    this.root = Promise.resolve();
  }

  setWriteStream(stream) {
    this.writeStream = stream;
  }

  errorHandler(stream, err) {

    stream.close();
    this.failure(err);
    if (!this.downloads.get(stream.path)) {
      this.downloads.set(stream.path, {failure:true});
    }
    this.downloads.get(stream.path)['failure'] = true;
  }

  responseHandler(file, response) {
    this.progress.setProductName(Path.parse(file).name);
    // let tempSize = response.headers['content-length'];
    // if (tempSize && parseInt(tempSize) > 0) {
    //   this.downloadSize += parseInt(tempSize);
    //   if (++this.received == this.totalDownloads && this.progress.totalSize == 0) {
    //     this.progress.setTotalDownloadSize(this.downloadSize);
    //   }
    // }
  }

  dataHandler(data) {
    this.currentSize += data.length;
    let now = Date.now();
    if (now - this.lastTime > 500) {
      this.progress.setCurrent(this.currentSize);
      this.lastTime = now;
    }
  }

  endHandler(stream) {
    stream.end();
  }

  closeHandler(file, sha) {
    if(this.downloads.get(file) && this.downloads.get(file)['failure']) {
      return;
    }
    if(sha) {
      Logger.log(`Configured file='${file}' sha256='${sha}'`);
      var h = new Hash();
      if(this.progress.current === 100) {
        this.progress.setStatus('Verifying Download');
      }
      h.SHA256(file, (dlSha) => {
        if(sha === dlSha) {
          Logger.log(`Downloaded file='${file}' sha256='${dlSha}'`);
          this.successHandler(file);
        } else {
          if(this.downloads.get(file)) {
            this.downloads.get(file)['failure'] = true;
          }
          this.failure('SHA256 checksum verification failed');
        }
      });
    } else {
      this.successHandler(file);
    }
  }

  successHandler(file) {
    if(this.downloads.get(file)) {
      this.downloads.get(file)['failure'] = false;
    }
    if(this.totalDownloads == ++this.downloaded ) {
      this.success();
    }
  }

  download(options, file, sha) {
    let stream = this.writeStream;
    this.downloads.set(stream.path, {options, sha, 'failure': false});
    this.root = this.root.then(() => {
      return new Promise((resolve)=>{
        request.get(this.setAdditionalOptions(options))
          .on('error', this.errorHandler.bind(this, stream))
          .on('error', resolve)
          .on('response', this.responseHandler.bind(this, file))
          .on('data', this.dataHandler.bind(this))
          .on('end', this.endHandler.bind(this, stream))
          .pipe(stream)
          .on('close', this.closeHandler.bind(this, stream.path, sha, options))
          .on('close', resolve);
      });
    });
    return this.root;
  }

  downloadAuth(options, username, password, file, sha) {
    let stream = this.writeStream;
    this.downloads.set(stream.path, {options, username, password, sha, 'failure': false});
    this.root = this.root.then(() => {
      return new Promise((resolve)=>{
        request.get(this.setAdditionalOptions(options))
          .auth(username, password)
          .on('error', this.errorHandler.bind(this, stream))
          .on('error', resolve)
          .on('response', this.responseHandler.bind(this, file))
          .on('data', this.dataHandler.bind(this))
          .on('end', this.endHandler.bind(this, stream))
          .pipe(stream)
          .on('close', this.closeHandler.bind(this, stream.path, sha, options))
          .on('close', resolve);
      });
    });
    return this.root;
  }

  restartDownload() {
    this.downloadSize = 0;
    this.received = 0;
    this.currentSize = 0;
    this.progress.setStatus('Downloading');
    for (var [key, value] of this.downloads.entries()) {
      if (value['failure'] && value.failure) {
        this.writeStream = fs.createWriteStream(key);
        if(value.hasOwnProperty('username')) {
          this.downloadAuth(value.options, value.username, value.password, key, value.sha);
        } else {
          this.download(value.options, key, value.sha);
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
