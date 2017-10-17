'use strict';

let globby = require('globby');
let path = require('path');
let loadMetadata = require('../../../browser/services/metadata');
let reqs = loadMetadata(require(path.join(rootPath, './requirements.json')), process.platform);

let paths = globby.sync('*.js', { cwd: __dirname, absolute: false });
let pages = new Array(paths.length - 1);
let expectedComponents = {};
let error = false;
let detectComponents = false;
let progressBars = {};

// initialize requirements, remove tools, mark detectable components
for (let key in reqs) {
  if (reqs[key].bundle === 'tools') {
    delete reqs[key];
  } else if (reqs[key].detectable === true) {
    expectedComponents[key] = { installedVersion: process.env['PDKI_TEST_INSTALLED_' + key.toUpperCase()], recommendedVersion: reqs[key].version };
  }
}

// remove virtualbox from hyperv tests
if (expectedComponents['hyperv'] && expectedComponents['hyperv'].installedVersion) {
  delete reqs['virtualbox'];
}

// find if some components are expected to be detected
for (var key in expectedComponents) {
  if (expectedComponents[key].installedVersion) {
    detectComponents = true;
    break;
  }
}

// load all test files
for (let item of paths) {
  if (item.endsWith('-test.js')) {
    let file = require('./' + item);
    pages[file.pageIndex] = file;
  }
}

module.exports = {
  'pages': pages,
  'reqs': reqs,
  'expectedComponents': expectedComponents,
  'detectComponents': detectComponents,
  'error': error,
  'progressBars': progressBars
}
