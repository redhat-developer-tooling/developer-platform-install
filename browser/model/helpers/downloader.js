'use strict';

let request = require('request');
let fs = require('fs-extra');

import Hash from './hash';

const remote = require('electron').remote;

class Downloader {
  constructor(progress, success, failure, downloadSize = 0, totalDownloads = 1) {
    this.downloadSize = downloadSize;
    this.totalDownloads = totalDownloads;
    this.lastTime = 0;
    this.progress = progress;
    this.success = success;
    this.failure = failure;
    this.downloads = new Map();
    this.userAgentString = '';
    if(remote) {
      this.userAgentString = remote.getCurrentWindow().webContents.session.getUserAgent();
    }
  }

  setWriteStream(stream) {
    this.writeStream = stream;
  }

  errorHandler(stream, err) {
    stream.close();
    this.failure(err);
    if (!this.downloads.get(stream.path)) {
      this.downloads.set(stream.path,{failure:true});
    }
    this.downloads.get(stream.path)['failure'] = true;
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
      if(this.downloads.get(file) && this.downloads.get(file)['failure']) {
        return;
      }
      if(sha) {
        var h = new Hash();
        h.SHA256(file,(dlSha) => {
          if(sha === dlSha) {
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
    if(--this.totalDownloads == 0 ) {
      this.success();
    }
  }

  download(options,file,sha) {
    let stream = this.writeStream;
    this.downloads.set(stream.path,{options,sha,'failure': false});
    request.get(this.setAdditionalOptions(options))
      .on('error', this.errorHandler.bind(this, stream))
      .on('response', this.responseHandler.bind(this))
      .on('data', this.dataHandler.bind(this))
      .on('end', this.endHandler.bind(this, stream))
      .pipe(stream)
      .on('close', this.closeHandler.bind(this,stream.path,sha));
  }

  downloadAuth(options, username, password, file, sha) {
    let stream = this.writeStream;
    this.downloads.set(stream.path,{options,username,password,sha,'failure': false});
    request.get(this.setAdditionalOptions(options))
      .auth(username, password)
      .on('error', this.errorHandler.bind(this, stream))
      .on('response', this.responseHandler.bind(this))
      .on('data', this.dataHandler.bind(this))
      .on('end', this.endHandler.bind(this, stream))
      .pipe(stream)
      .on('close', this.closeHandler.bind(this,stream.path,sha));
  }

  restartDownload() {
    this.progress.setStatus('Downloading');
    for (var [key, value] of this.downloads.entries()) {
      if (value['failure'] && value.failure) {
        this.writeStream = fs.createWriteStream(key);
        if(value.hasOwnProperty('username')) {
          this.downloadAuth(value.options,value.username,value.password,key,value.sha);
        } else {
          this.download(value.options,key,value.sha);
        }
      }
    }
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
    return optionsObj;
  }
}

export default Downloader;
