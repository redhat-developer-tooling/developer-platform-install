'use strict';

let comm = require('./common.js'),
  progress = require('request-progress'),
  path = require('path'),
  request = require('request'),
  fs = require('fs-extra');

function downloadFile(fromUrl, toFile, onFinish) {
  //request(fromUrl).pipe(fs.createWriteStream(toFile)).on('finish', onFinish);
  let previous = -1;

  progress(request(fromUrl), {
    throttle: 5000,
    delay: 0,
    lengthHeader: 'content-length'
  })
  .on('progress', (state) => {
    if (previous == -1) {
      console.log('[INFO] \'' + toFile + '\' download started from \'' + fromUrl + '\'');
      console.log('0%');
      previous = 0;
    }
    let current = Math.round(state.percent*100);
    if(current!=100 && current!=0 && previous!=current) {
      console.log(current + '%');
    }
    previous = current;
  })
  .on('end', ()=>{
    if (previous == -1) {
      console.log('[INFO] \'' + toFile + '\' download started from \'' + fromUrl + '\'');
      console.log('0%');
    }
    console.log('100%');
  })
  .pipe(fs.createWriteStream(toFile)).on('finish', onFinish);
}


function downloadAndReadSHA256(targetFolder, fileName, reqURL, reject, processResult) {
  let currentFile = path.join(targetFolder, fileName);
  let currentSHA256 = 'NOSHA256SUM';
  if (reqURL.length == 64 && reqURL.indexOf('http')<0 && reqURL.indexOf('ftp')<0) {
    // return the hardcoded SHA256sum in requirements.json
    if(!fileName.endsWith('.sha256')) {
      console.log('[INFO] \'' + fileName + '\' hardcoded sha256 check');
    }
    processResult(reqURL);
  } else {
    // download the remote SHA256sum, save the file, and return its value to compare to existing downloaded file
    console.log('[INFO] \'' + fileName + '\' remote sha256 check');
    downloadFile(reqURL, currentFile, (err)=>{
      if (err) {
        reject(err);
      } else {
        // read the contents of the sha256sum file
        currentSHA256 = fs.readFileSync(currentFile, 'utf8');
        processResult(currentSHA256);
      }
    });
  }
}

function downloadFileAndCreateSha256(targetFolder, fileName, reqURL, sha256sum, resolve, reject) {
  let currentFile = path.join(targetFolder, fileName);
  downloadFile(reqURL, currentFile, (err, res)=>{
    if (err) {
      reject(err);
    } else {
      comm.getSHA256(currentFile, (currentSHA256)=>{
        if(currentSHA256 == sha256sum) {
          console.log( '[INFO] \'' + currentFile + '\' is downloaded and sha256 is correct');
          comm.createSHA256File(currentFile, (shaGenError)=>{
            shaGenError ? reject(shaGenError) : resolve(res);
          });
        } else {
          reject( '\'' + currentFile + '\' is downloaded and sha256 is not correct');
        }
      });
    }
  });
}

function prefetch(reqs, bundle, targetFolder) {
  let promises = new Array();
  for (let key in reqs) {
    if (reqs[key].bundle === bundle) {
      let currentFile = path.join(targetFolder, key);
      promises.push(() => {
        return new Promise((resolve, reject) => {
          // if file is already downloaded, check its sha against the stored one
          downloadAndReadSHA256(targetFolder, key + '.sha256', reqs[key].sha256sum, reject, (currentSHA256) => {
            //console.log('[DEBUG] SHA256SUM for ' + key + ' = ' + currentSHA256);
            comm.isExistingSHA256Current(currentFile, currentSHA256, (dl) => {
              if(dl) {
                console.log('[INFO] \'' + currentFile + '\' SHA256 is correct, no download required');
                resolve(true);
              } else {
                if(fs.existsSync(currentFile)) {
                  console.log('[INFO] \'' + currentFile + '\' SHA256 is not correct, download required');
                } else {
                  console.log('[INFO] \'' + currentFile + '\' is not downloaded yet');
                }
                downloadFileAndCreateSha256(targetFolder, key, reqs[key].url, currentSHA256, resolve, reject);
              }
            });
          });
        });
      });
    }
  }
  return promises.reduce( function(pacc, fn) { return pacc.then(fn); }, Promise.resolve() );
}

module.exports = {
  downloadFile,
  downloadAndReadSHA256,
  downloadFileAndCreateSha256,
  prefetch
};
