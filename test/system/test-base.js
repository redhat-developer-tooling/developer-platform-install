'use strict';

let path = require('path');

let conditions = protractor.ExpectedConditions;
let webdriver = browser.driver;
const user = 'devsuite.test@gmail.com';
const pass = 'Devsuite';
let loadMetadata = require('../../browser/services/metadata');
let reqs = loadMetadata(require(path.join(rootPath, './requirements.json')), process.platform);

for (let key in reqs) {
  if (reqs[key].bundle === 'tools') {
    delete reqs[key];
  }
}

let expectedComponents = {
  virtualbox: { installedVersion: process.env.PDKI_TEST_INSTALLED_VBOX, recommendedVersion: reqs.virtualbox.version },
  jdk: { installedVersion: process.env.PDKI_TEST_INSTALLED_JDK, recommendedVersion: reqs.jdk.version.substring(0, 5) }
};
if (process.platform === 'win32') {
  expectedComponents.cygwin = { installedVersion: process.env.PDKI_TEST_INSTALLED_CYGWIN, recommendedVersion: reqs.cygwin.version };
  expectedComponents.hyperv = { installedVersion: process.env.PDKI_TEST_INSTALLED_HYPERV, recommendedVersion: '0' };
}

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

let hypervisor = 'Virtualbox';
if (expectedComponents.hyperv && expectedComponents.hyperv.installedVersion) {
  hypervisor = 'Hyper-v';
}

function systemTest() {
  describe('System Tests on ' + hypervisor, function() {
    let timeout = 45*60*1000;
    let usernameField, passwordField, loginButton;
    let error = false;

    if (hypervisor === 'Virtualbox') {
      delete reqs.hyperv;
      delete expectedComponents.hyperv;
    } else {
      delete reqs.virtualbox;
      delete expectedComponents.virtualbox;
    }

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
          let defaultFolder;

          switch (process.platform) {
            case 'win32':
              defaultFolder = path.join('c:', 'DevelopmentSuite');
              break;
            case 'darwin':
              defaultFolder = '/Applications/DevelopmentSuite';
              break;
          }

          expect(locationField.getAttribute('value')).toEqual(defaultFolder);
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
            for (var key in reqs) {
              reqs[key].installedNote = element(By.id(key + '-installed-note'));
              reqs[key].panel = element(By.id(key + '-panel-heading'));
              reqs[key].checkbox = element(By.id(key + '-checkbox'));
            }
            if (reqs.virtualbox) {
              reqs.virtualbox.newerWarning = element(By.id('virtualbox-newer-warning'));
              reqs.virtualbox.olderError = element(By.id('virtualbox-older-error'));
            }
            reqs.jdk.olderError = element(By.id('jdk-older-warning'));
          }
        });

        if (detectComponents) {
          it('should properly detect the installed components', function() {
            for (var key in reqs) {
              if (expectedComponents[key] && expectedComponents[key].installedVersion) {
                expect(reqs[key].installedNote.isDisplayed()).toBe(true);
                expect(reqs[key].panel.getAttribute('class')).toMatch('dotted-panel');
                expect(reqs[key].installedNote.getText()).toMatch(expectedComponents[key].installedVersion);
              }
            }
          });

          it('should not affect the undetected components', function() {
            for (var key in reqs) {
              if (expectedComponents[key] && !expectedComponents[key].installedVersion) {
                expect(reqs[key].installedNote.isDisplayed()).toBe(false);
                expect(reqs[key].panel.getAttribute('class')).not.toMatch('dotted-panel');
              }
            }
          });

          it('should allow reinstallation of non-msi software', function() {
            for (var key in expectedComponents) {
              if (expectedComponents[key].installedVersion && !(key === 'virtualbox' || key === 'jdk' || key === 'hyperv')) {
                expect(reqs[key].checkbox.isEnabled()).toBe(true);
              }
            }
          });

          it('should not allow reinstallation of msi packages', function() {
            for (var key in expectedComponents) {
              if (expectedComponents[key].installedVersion && (key === 'virtualbox' || key === 'jdk' || key === 'hyperv')) {
                expect(reqs[key].checkbox.isEnabled()).toBe(false);
              }
            }
          });

          it('should display a warning when a component is newer than recommended', function() {
            for (var key in expectedComponents) {
              if (reqs[key].newerWarning && expectedComponents[key].installedVersion > expectedComponents[key].recommendedVersion) {
                expect(reqs[key].newerWarning.isDisplayed()).toBe(true);
              }
            }
          });

          if (reqs.virtualbox) {
            it('should display an error when virtualbox is older than recommended', function() {
              for (var key in expectedComponents) {
                if (reqs[key].olderError && expectedComponents[key].installedVersion < expectedComponents[key].recommendedVersion) {
                  error = true;
                  expect(reqs[key].olderError.isDisplayed()).toBe(true);
                }
              }
            });
          }

          it('should display a warning when jdk is older than recommended', function() {
            if(expectedComponents.jdk.installedVersion < expectedComponents.jdk.recommendedVersion) {
              expect(reqs.jdk.olderWarning.isDisplayed()).toBe(true);
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
            for (var key in reqs) {
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
              browser.getCurrentUrl().then(function(url) {
                //Installation finished
                if (url.endsWith('/start')) {
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
                    }).catch(function(error) {
                      if (error.message.indexOf('element is not attached') > -1) {
                        browser.getCurrentUrl().then(function(url) {
                          if (!url.endsWith('/start')) {
                            throw error;
                          }
                        });
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
