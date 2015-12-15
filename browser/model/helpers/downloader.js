'use strict';

let request = require('request');

class Downloader {
  constructor(progress, success, failure, downloadSize, totalDownloads) {
    if (downloadSize) {
      this.downloadSize = downloadSize;
    } else {
      this.downloadSize = 0;
    }
    if (totalDownloads) {
      this.totalDownloads = totalDownloads;
      this.handleSize = false;
    } else {
      this.totalDownloads = 1;
      this.handleSize = true;
    }
    this.currentSize = 0;
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
    if (this.handleSize) {
      let tempSize = response.headers['content-length'];
      if (tempSize !== undefined && tempSize > 0) {
        this.downloadSize = tempSize;
      }
    }
  }

  dataHandler(data) {
    this.currentSize += data.length;
    this.progress.setCurrent(Math.round((this.currentSize / this.downloadSize) * 100));
    this.progress.setLabel(this.progress.current + "%");
  }

  endHandler(stream) {
    stream.end();
  }

  closeHandler() {
    if (--this.totalDownloads == 0) {
      return this.success();
    }
  }

  download(options) {
    let stream = this.writeStream;
    request.get(options)
      .on('error', this.errorHandler.bind(this, stream))
      .on('response', this.responseHandler.bind(this))
      .on('data', this.dataHandler.bind(this))
      .on('end', this.endHandler.bind(this, stream))
      .pipe(stream)
      .on('close', this.closeHandler.bind(this));
  }

  downloadAuth(options, username, password) {
    let stream = this.writeStream;
    request.get(options)
      .auth(username, password)
      .on('error', this.errorHandler.bind(this, stream))
      .on('response', this.responseHandler.bind(this))
      .on('data', this.dataHandler.bind(this))
      .on('end', this.endHandler.bind(this, stream))
      .pipe(stream)
      .on('close', this.closeHandler.bind(this));
  }
}

export default Downloader;
