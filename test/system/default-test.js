'use strict';

let path = require('path');

let conditions = protractor.ExpectedConditions;
let webdriver = browser.driver;
const user = 'devsuite.test@gmail.com';
const pass = 'devsuite';

describe('System tests', function() {
  let timeout = 45*60*1000;
  let progress = {};
  let usernameField, passwordField, loginButton;

  beforeAll(function() {
    webdriver.wait(protractor.until.elementLocated(By.id('loginButton')), 20000)
    .then(function(elm) {
      loginButton = elm;
      usernameField = element(By.id('username'));
      passwordField = element(By.id('password'));
    });
  });

  describe('Default installation', function() {
    it('should log in', function() {
      usernameField.sendKeys(user);
      passwordField.sendKeys(pass);
      loginButton.click();
    });

    it('should use the default target folder', function() {
      let locationField = element(By.id('location-browse-input-folder'));
      let nextButton = element(By.id('location-install-btn'));

      expect(locationField.getAttribute('value')).toEqual(path.join('c:', 'DevelopmentSuite'));
      expect(nextButton.isEnabled()).toBe(true);

      nextButton.click();
    });

    it('should confirm the installation', function() {
      let installButton = element(By.id('confirm-install-btn'));
      browser.wait(conditions.elementToBeClickable(installButton), 5000);
      installButton.click();
    });

    it('should not fail during the installation', function(done) {
      browser.ignoreSynchronization = true;
      progress['virtualbox'] = element(By.id('virtualbox-progress'));
      progress['vagrant'] = element(By.id('vagrant-progress'));
      progress['cygwin'] = element(By.id('cygwin-progress'));
      progress['cdk'] = element(By.id('cdk-progress'));
      progress['jdk'] = element(By.id('jdk-progress'));
      progress['jbds'] = element(By.id('devstudio-progress'));

      let startTime = new Date().getTime();

      let check = function() {
        //Installation finished
        browser.getLocationAbsUrl().then(function(url) {
          if (url === '/start') {
            clearInterval(check);
            let closeButton = element(By.id('exit-btn'));
            closeButton.click();
            done();
          //Timed out
          } else if (new Date().getTime() - startTime > timeout) {
            clearInterval(check);
            fail(timeout/60000 + ' minute timeout exceeded');
            done();
          } else {
            //Check if something failed
            for (var key in progress) {
              progress[key].getText().then(function(text) {
                if (text.indexOf('Failed') > -1) {
                  clearInterval(check);
                  let product = text.substring(0, text.indexOf('-'));
                  fail(product + 'failed to install');
                  done();
                }
              });
            }
          }
        });
      }

      setInterval(check, 2000);
    }, 50*60*1000);
  });
});
