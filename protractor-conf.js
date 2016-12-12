var files;
var report;
var platform =  process.platform + '-' + process.arch;
var installerExecSuffix = "";

if(process.platform === 'darwin') {
  installerExecSuffix = '.app/Contents/MacOS/devsuite';
} else if(process.platform === 'win32') {
  installerExecSuffix = '.exe';
}
var executable = './dist/' + platform +'/devsuite-' + platform + '/devsuite' + installerExecSuffix;

if (process.env.PTOR_TEST_RUN === 'system') {
  files = ['test/system/system-test.js'];
  report = 'system-tests';
  executable = process.env.PTOR_BINARY;
} else {
  //start with login and end with installation page, because of angular synchronization issues
  files = ['test/ui/login-test.js', 'test/ui/location-test.js', 'test/ui/confirm-test.js', 'test/ui/start-test.js', 'test/ui/install-test.js'];
  report = 'ui-tests';
}

exports.config = {
  directConnect: true,

  specs: files,
  framework: 'jasmine2',

  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      binary: executable
    }
  },

  onPrepare: function() {
    var jasmineReporters = require('jasmine-reporters');
    jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
      consolidateAll: true,
      filePrefix: report
    }));
  }
}
