'use strict';
let loadMetadata = require('../browser/services/metadata');
let reqs = loadMetadata(require('../requirements.json'), process.platform);
let request = require('request');

let data = new Object();
let fileNames = new Object();
let count = 0;

function checkRequirements() {
  for (let attribute in reqs) {
    // sha256 is not set for macOS Java SE
    if(reqs[attribute].sha256sum !== '' && reqs[attribute].url) {
      data[attribute] = reqs[attribute].url;
      count++;
    } else {
      console.log(`skip ${attribute} no sha256sum configured` );
    }
  }

  //to check if the url looks like it points to what it is supposed to
  fileNames['cdk'] = 'cdk';
  fileNames['minishift-rhel'] = 'rhel';
  fileNames['oc'] = 'oc-origin-cli';
  fileNames['cygwin'] = 'cygwin';
  fileNames['devstudio'] = 'devstudio';
  fileNames['jbosseap'] = 'jboss-eap';
  fileNames['jdk'] = 'openjdk';
  fileNames['virtualbox'] = 'virtualbox';
  fileNames['7zip'] = '7-Zip';
  fileNames['7zip-extra'] = '7-Zip';
  fileNames['kompose'] = 'kompose';
  fileNames['fuseplatformkaraf'] = 'karaf';
  fileNames['devstuidocentraljbpm'] = 'devstudio-integration-stack';

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
        throw new Error('Request for ' + key + ' url returned code ' + response.statusCode);
      }
      console.log(key + ' - url: ' + reqs[key].url);
      console.log(key + ' - size: ' + size + 'B');

      if (reqs[key].size!=size) {
        req.abort();
        throw new Error(`${key} size ${size} does not match with size ${reqs[key].size} declared in requirements.json`);
      } else {
        console.log(key + ' - size: ' + reqs[key].size + 'B in requirements.json');
        req.abort();
      }
      console.log();
    })
    .on('end', function() {
      if (--count === 0) {
        console.log('Checking download URLs complete');
        console.log('-------------------------------');
      }
    })
    .on('error', function(err) {
      console.log(`Download failed for ${key}`);
      req.abort();
      throw err;
    });
}

checkRequirements();
