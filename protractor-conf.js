exports.config = {
  directConnect: true,

  specs: ['test/ui/**/*.js'],
  framework: 'jasmine2',

  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      binary: './dist/win/DeveloperPlatformInstaller-win32-x64/DeveloperPlatformInstaller.exe'
    },

    onPrepare: function() {
      browser.driver.manage().window().maximize();
      browser.driver.get('browser/index.html');
    }
  }
}
