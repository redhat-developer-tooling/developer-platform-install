'use strict';

let webdriver = browser.driver;

describe('basic ui test', function() {

  it('should not crash', function() {
    webdriver.getTitle().then(function(title) {
      expect(title).toEqual('Red Hat Developer Platform Installer');
    });

    webdriver.wait(protractor.until.elementLocated(By.className("btn-lg")), 10000)
    .then(function(elm) {
      expect(elm.isEnabled()).toEqual(false);
    });

  });
});
