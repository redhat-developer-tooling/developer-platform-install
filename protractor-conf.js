exports.config = {
  directConnect: true,

  specs: ['test/ui/login-test.js', 'test/ui/**/*!(login)-test.js'],
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
      filePrefix: 'ui-tests'
    }));
  }
}
