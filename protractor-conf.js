var files;
var report;

if (process.env.PTOR_TEST_RUN === 'system') {
  files = ['test/system/*.js'];
  report = 'system-tests';
} else {
  files = ['test/ui/login-test.js', 'test/ui/**/*!(login)-test.js'];
  report = 'ui-tests';
}


exports.config = {
  directConnect: true,

  specs: files,
  framework: 'jasmine2',

  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      binary: './dist/win/development-suite-win32-x64/development-suite.exe'
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
