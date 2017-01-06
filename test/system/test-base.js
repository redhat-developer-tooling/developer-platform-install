'use strict';

let path = require('path');

let conditions = protractor.ExpectedConditions;
let webdriver = browser.driver;
const user = 'devsuite.test@gmail.com';
const pass = 'Devsuite';

let reqs = require(path.resolve('./requirements-' + process.platform + '.json'));
let expectedComponents = {
  virtualbox: { installedVersion: process.env.PDKI_TEST_INSTALLED_VBOX, recommendedVersion: reqs['virtualbox.exe'].version },
  vagrant: { installedVersion: process.env.PDKI_TEST_INSTALLED_VAGRANT, recommendedVersion: reqs['vagrant.msi'].version },
  cygwin: { installedVersion: process.env.PDKI_TEST_INSTALLED_CYGWIN, recommendedVersion: reqs['cygwin.exe'].version },
  jdk: { installedVersion: process.env.PDKI_TEST_INSTALLED_JDK, recommendedVersion: reqs['jdk.msi'].version.substring(0, 5) }
};

let detectComponents = false;
for (var key in expectedComponents) {
  if (expectedComponents[key].installedVersion) {
    detectComponents = true;
    break;
  }
}

let target = process.env.PDKI_TEST_TARGET_FOLDER;
let name = detectComponents ? 'Component Detection Test' : 'Default Test';
if (target && target.length > 0) {
  name += ' with Custom Target Folder';
}

function systemTest() {
  describe('System Tests', function() {
    let timeout = 45*60*1000;
    let usernameField, passwordField, loginButton;
    let error = false;

    let components = {
      virtualbox: {},
      cygwin: {},
      vagrant: {},
      cdk: {},
      jdk: {},
      devstudio: {}
    };
    let progress = {};

    beforeAll(function() {
      webdriver.wait(protractor.until.elementLocated(By.id('loginButton')), 20000)
      .then(function(elm) {
        loginButton = elm;
        usernameField = element(By.id('username'));
        passwordField = element(By.id('password'));
      });
    });

    describe(name, function() {
      it('should log in', function() {
        usernameField.sendKeys(user);
        passwordField.sendKeys(pass);
        loginButton.click();
      });

      it('should use the specified target folder', function() {
        webdriver.wait(protractor.until.elementLocated(By.id('location-browse-input-folder')), 30000)
        .then(function(elm) {
          let locationField = elm;
          let nextButton = element(By.id('location-install-btn'));

          expect(locationField.getAttribute('value')).toEqual(path.join('c:', 'DevelopmentSuite'));
          expect(nextButton.isEnabled()).toBe(true);

          if (target && target.length > 0) {
            locationField.clear();
            locationField.sendKeys(target);
          }

          nextButton.click();
        });
      });

      describe('Detection and Installation', function() {
        let installButton, backButton;

        beforeAll(function() {
          installButton = element(By.id('confirm-install-btn'));
          backButton = element(By.id('confirm-back-btn'));
          browser.wait(conditions.elementToBeClickable(backButton), 60000);

          if (detectComponents) {
            for (var key in components) {
              components[key].installedNote = element(By.id(key + '-installed-note'));
              components[key].panel = element(By.id(key + '-panel-heading'));
              components[key].checkbox = element(By.id(key + '-checkbox'));
            }
            components['vagrant'].newerWarning = element(By.id('vagrant-newer-warning'));
            components['vagrant'].olderError = element(By.id('vagrant-older-error'));
            components['virtualbox'].newerWarning = element(By.id('virtualbox-newer-warning'));
            components['virtualbox'].olderError = element(By.id('virtualbox-older-error'));
            components['jdk'].olderError = element(By.id('jdk-older-warning'));
          }
        });

        if (detectComponents) {
          it('should properly detect the installed components', function() {
            for (var key in components) {
              if (expectedComponents[key] && expectedComponents[key].installedVersion) {
                expect(components[key].installedNote.isDisplayed()).toBe(true);
                expect(components[key].panel.getAttribute('class')).toMatch('dotted-panel');
              }
            }
          });

          it('should not affect the undetected components', function() {
            for (var key in components) {
              if (expectedComponents[key] && !expectedComponents[key].installedVersion) {
                expect(components[key].installedNote.isDisplayed()).toBe(false);
                expect(components[key].panel.getAttribute('class')).not.toMatch('dotted-panel');
              }
            }
          });

          it('should allow reinstallation of non-msi software', function() {
            for (var key in expectedComponents) {
              if (expectedComponents[key].installedVersion && !(key === 'vagrant' || key === 'virtualbox' || key === 'jdk')) {
                expect(components[key].checkbox.isEnabled()).toBe(true);
              }
            }
          });

          it('should not allow reinstallation of msi packages', function() {
            for (var key in expectedComponents) {
              if (expectedComponents[key].installedVersion && (key === 'vagrant' || key === 'virtualbox' || key === 'jdk')) {
                expect(components[key].checkbox.isEnabled()).toBe(false);
              }
            }
          });

          it('should display a warning when a component is newer than recommended', function() {
            for (var key in expectedComponents) {
              if (components[key].newerWarning && expectedComponents[key].installedVersion > expectedComponents[key].recommendedVersion) {
                expect(components[key].newerWarning.isDisplayed()).toBe(true);
              }
            }
          });

          it('should display an error when vagrant or virtualbox is older than recommended', function() {
            for (var key in expectedComponents) {
              if (components[key].olderError && expectedComponents[key].installedVersion < expectedComponents[key].recommendedVersion) {
                error = true;
                expect(components[key].olderError.isDisplayed()).toBe(true);
              }
            }
          });

          it('should display a warning when jdk is older than recommended', function() {
            if(expectedComponents['jdk'].installedVersion < expectedComponents['jdk'].recommendedVersion) {
              expect(components['jdk'].olderWarning.isDisplayed()).toBe(true);
            }
          });
        }

        it('should not allow to continue if an error is present', function() {
          if (error) {
            expect(installButton.isEnabled()).toBe(false);
          }
        });

        it('should confirm the installation with no errors', function() {
          if (!error) {
            installButton.click();
          }
        });

        it('should display progress bars for components being installed', function(done) {
          if (!error) {
            browser.ignoreSynchronization = true;
            for (var key in components) {
              if (!expectedComponents[key] || (expectedComponents[key] && !expectedComponents[key].installedVersion)) {
                progress[key] = element(By.id(key + '-progress'));
              }
            }
          }
          done();
        });

        it('should not fail during the installation', function(done) {
          if (!error) {
            let startTime = new Date().getTime();

            let check = function() {
              browser.getLocationAbsUrl().then(function(url) {
                //Installation finished
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
            };

            setInterval(check, 2000);
          } else {
            done();
          }
        }, 50*60*1000);
      });
    });
  });
}

module.exports.systemTest = systemTest;
