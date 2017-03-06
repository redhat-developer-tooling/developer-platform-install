'use strict';

let reqs = require('../requirements-' + process.platform + '.json');
let request = require('request');

let minSizes = new Object();
let data = new Object();
let fileNames = new Object();
let count = 0;

function checkRequirements() {
  for (var attribute in reqs) {
    // sha256 is not set for macOS Java SE
    if(reqs[attribute].sha256sum !== '') {
      data[attribute] = reqs[attribute].url;
      count++;
    }
  }

  //to check if the url looks like it points to what it is supposed to
  fileNames['cdk'] = 'cdk';
  fileNames['minishift-rhel'] = 'rhel';
  fileNames['oc'] = 'oc-origin-cli';
  fileNames['cygwin'] = 'cygwin';
  fileNames['devstudio'] = 'devstudio';
  fileNames['jdk'] = 'openjdk';
  fileNames['virtualbox'] = 'virtualbox';
  fileNames['7zip'] = '7-Zip';
  fileNames['7zip-extra'] = '7-Zip';

  //to check if the files are rougly the size they should be
  minSizes['cdk'] = 50 * 1024;
  minSizes['minishift-rhel'] = 300 * 1024 * 1024;
  minSizes['oc.zip'] = 10 * 1024 * 1024;
  minSizes['cygwin'] = 500 * 1024;
  minSizes['devstudio'] = 400 * 1024 * 1024;
  minSizes['jdk'] = 50 * 1024 *1024;
  minSizes['virtualbox'] = 85 * 1024 * 1024;
  minSizes['7zip'] = 200 * 1024;
  minSizes['7zip-extra'] = 400 * 1024;

  console.log('-------------------------------');
  console.log('Checking download URLs');
  for (var key in data) {
    checkFileName(key);
    checkUrl(key);
  }
}

function checkFileName(key) {
  if (!data[key].includes(fileNames[key])) {
    throw new Error(key + ' - the url does not contain ' + fileNames[key] + ': ' + data[key]);
  }
}

function checkUrl(key) {
  let req = request.get(data[key])
  .on('response', function(response) {
    let size = response.headers['content-length'];
    if (response.statusCode !== 200) {
      req.abort();
      throw new Error(key + ' url returned code ' + response.statusCode);
    }
    console.log(key + ' - url: ' + data[key]);
    console.log(key + ' - size: ' + size + 'B');
    console.log();

    if (size < minSizes[key]) {
      req.abort();
      throw new Error(key + ' is unexpectedly small with just ' + size + ' bytes in size');
    } else {
      req.abort();
    }
  })
  .on('end', function() {
    if (--count === 0) {
      console.log('Checking download URLs complete');
      console.log('-------------------------------');
    }
  })
  .on('error', function(err) {
    req.abort();
    throw err;
  });
}

checkRequirements();
