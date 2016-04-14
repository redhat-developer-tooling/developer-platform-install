'use strict';

let request = require('request');

import Hash from './hash';

class Downloader {
  constructor(progress, success, failure, downloadSize = 0, totalDownloads = 1) {
    this.downloadSize = downloadSize;
    this.totalDownloads = totalDownloads;
    this.lastTime = 0;
    this.progress = progress;
    this.success = success;
    this.failure = failure;
  }

  setWriteStream(stream) {
    this.writeStream = stream;
  }

  errorHandler(stream, err) {
    stream.close();
    this.failure(err);
  }

  responseHandler(response) {
    if (this.downloadSize == 0) {
      let tempSize = response.headers['content-length'];
      if (tempSize !== undefined && tempSize > 0) {
        this.downloadSize = tempSize;
      }
    }
    this.progress.setTotalDownloadSize(this.downloadSize);
    this.lastTime = Date.now();
  }

  dataHandler(data) {
    let current = Date.now();
    this.progress.downloaded(data.length, current - this.lastTime);
    this.lastTime = current;
  }

  endHandler(stream) {
    stream.end();
  }

  closeHandler(file,sha) {
    if (--this.totalDownloads == 0) {
      if(sha) {
        var h = new Hash();
        h.SHA256(file,(dlSha) => {
          if(sha === dlSha) {
            this.success();
          } else {
            this.failure('SHA256 checksum verification failed');
          }
        });
      } else {
        this.success();
      }
    }
  }

  download(options,file,sha) {
    let stream = this.writeStream;
    request.get(options, {timeout:15000}, (error, response, body) => {
          if(error) {
            this.failure(error);
          }
      })
      .on('error', this.errorHandler.bind(this, stream))
      .on('response', this.responseHandler.bind(this))
      .on('data', this.dataHandler.bind(this))
      .on('end', this.endHandler.bind(this, stream))
      .pipe(stream)
      .on('close', this.closeHandler.bind(this,file,sha));
  }

  downloadAuth(options, username, password,file,sha) {
    let stream = this.writeStream;
    request.get(options)
      .auth(username, password)
      .on('error', this.errorHandler.bind(this, stream))
      .on('response', this.responseHandler.bind(this))
      .on('data', this.dataHandler.bind(this))
      .on('end', this.endHandler.bind(this, stream))
      .pipe(stream)
      .on('close', this.closeHandler.bind(this,file,sha));
  }
}

export default Downloader;
