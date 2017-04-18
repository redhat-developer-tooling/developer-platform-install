var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf')

var ScreenshotReporter = function(directory, cleanExisting) {
  var dir = (directory ? directory : "screenshots");

  if (fs.existsSync(dir) && cleanExisting) {
    rimraf.sync(dir);
  }

  var screenshot = function(testDescription) {
    var filename = testDescription.replace(/\s/g, '_') + '_' + '.png';
    mkdirp.sync(dir);
    browser.takeScreenshot().then(function(png) {
      var stream = fs.createWriteStream(path.join(dir, filename));
      stream.write(new Buffer(png, 'base64'));
      stream.end();
    });
  }

  this.specDone = function(spec) {
    if (spec.status === "failed") {
      screenshot(spec.description);
    }
  };
};

module.exports = ScreenshotReporter;
