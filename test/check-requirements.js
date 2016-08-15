'use strict';

let reqs = require('../requirements.json');
let request = require("request");

let minSizes = new Object();
let data = new Object();
let fileNames = new Object();
let count = 0;

function checkRequirements() {
  for (var attribute in reqs) {
    data[attribute] = reqs[attribute].url;
    count++;
  }

  //to check if the url looks like it points to what it is supposed to
  fileNames['cdk.zip'] = 'cdk';
  fileNames['rhel-vagrant-virtualbox.box'] = 'rhel-7-cdk';
  fileNames['oc.zip'] = 'origin-client-tools';
  fileNames['cygwin.exe'] = 'cygwin';
  fileNames['jbds.jar'] = 'devstudio';
  fileNames['jdk.msi'] = 'openjdk';
  fileNames['vagrant.msi'] = 'vagrant';
  fileNames['virtualbox.exe'] = 'virtualbox';
  fileNames['7zip.zip'] = '7-Zip';
  fileNames['7zip-extra.zip'] = '7-Zip';

  //to check if the files are rougly the size the should be
  minSizes['cdk.zip'] = 50 * 1024;
  minSizes['rhel-vagrant-virtualbox.box'] = 750 * 1024 * 1024;
  minSizes['oc.zip'] = 10 * 1024 * 1024;
  minSizes['cygwin.exe'] = 500 * 1024;
  minSizes['jbds.jar'] = 400 * 1024 * 1024;
  minSizes['jdk.msi'] = 50 * 1024 *1024;
  minSizes['vagrant.msi'] = 120 * 1024 * 1024;
  minSizes['virtualbox.exe'] = 100 * 1024 * 1024;
  minSizes['7zip.zip'] = 200 * 1024;
  minSizes['7zip-extra.zip'] = 400 * 1024;

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
      req.abort()
      throw new Error(key + ' url returned code ' + response.statusCode);
    }
    console.log(key + ' - url: ' + data[key]);
    console.log(key + ' - size: ' + size + 'B');
    console.log();

    if (size < minSizes[key]) {
      req.abort()
      throw new Error(key + ' is unexpectedly small with just ' + size + ' bytes in size');
    } else {
      req.abort()
    }
  })
  .on('end', function() {
    if (--count === 0) {
      console.log('Checking download URLs complete');
      console.log('-------------------------------');
    }
  })
  .on('error', function(err) {
    req.abort()
    throw err;
  });
}

checkRequirements();
