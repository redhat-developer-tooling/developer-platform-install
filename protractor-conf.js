exports.config = {
  directConnect: true,

  specs: ['test/ui/login-test.js', 'test/ui/**/*!(login)-test.js'],
  framework: 'jasmine2',

  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      binary: './dist/win/jboss-devstudio-platform-win32-x64/jboss-devstudio-platform.exe'
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
