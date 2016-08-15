'use strict';

let webdriver = browser.driver;
let context = { pageName: 'Confirmation' };
let breadcrumbBase = require('./breadcrumbs-base');
let requirements = require(require('path').resolve('./requirements.json'));

describe('Confirm page', function() {
  let confirmForm, detectionInfo, nextButton;

  beforeAll(function() {
    browser.setLocation('confirm')
    .then(function() {
      confirmForm = element(By.id('confirmForm'));
      detectionInfo = element(By.id('detection-info'));
      nextButton = element(By.id('confirm-install-btn'));
    });
  });

  it('should activate component detection on load', function() {
    expect(detectionInfo.getAttribute('class')).toMatch('active');
    expect(detectionInfo.getText()).toEqual('The system is checking if you have any installed components.');
  });

  it('should deactivate the form during detection', function() {
    expect(confirmForm.getAttribute('class')).toMatch('is-disabled');
  });

  breadcrumbBase.describeBreadcrumbs(context);

  describe('after detection', function() {
    let components = {
      virtualbox: requirements['virtualbox.exe'],
      cygwin: requirements['cygwin.exe'],
      vagrant: requirements['vagrant.msi'],
      cdk: requirements['cdk.zip'],
      jdk: requirements['jdk.msi'],
      devstudio: requirements['jbds.jar']
    };
    let messages = {
      detected: 'Using detected version',
      older: 'Older than recommended!',
      newer: 'Newer than recommended!'
    };

    let footer, cancelButton, backButton;

    beforeAll(function() {
      webdriver.wait(protractor.until.elementIsVisible(element(By.id('instructions'))))
      .then(function() {
        for (var key in components) {
          components[key].name = components[key].name.toUpperCase();
          components[key].panel = element(By.id(key + '-panel'));
          components[key].nameElement = element(By.id(key + '-name'));
          components[key].versionElement = element(By.id(key + '-version'));
          components[key].descriptionElement = element(By.id(key + '-description'));

          if(key === 'vagrant' || key === 'virtualbox') {
            components[key].installedNote = element(By.id(key + '-installed-note'));
            components[key].newerWarning = element(By.id(key + '-newer-warning'));
            components[key].newerMessage = element(By.id(key + '-newer-message'));
            components[key].olderError = element(By.id(key + '-older-error'));
            components[key].olderMessage = element(By.id(key + '-older-message'));
          }
        }
        footer = element(By.id('footer-navigation'));
        cancelButton = element(By.id('confirm-cancel-btn'));
        backButton = element(By.id('confirm-back-btn'));
      });
    });

    //scoll down and select Java if it is deselected by default so that all panels appear on install screen
    afterAll(function() {
      let checkbox = components.jdk.panel.all(By.model('checkboxModel.jdk.selectedOption')).first();
      browser.executeScript('window.scrollTo(0,10000);').then(function() {
        return checkbox.isEnabled().then(function(enabled) {
          if (enabled) {
            return checkbox.isSelected().then(function(selected) {
              if (!selected) {
                checkbox.click();
              }
            });
          }
        });
      });
    });

    it('should display a footer with navigation', function() {
      expect(footer.isDisplayed()).toBe(true);
      expect(cancelButton.isDisplayed()).toBe(true);
      expect(cancelButton.isEnabled()).toBe(true);
      expect(backButton.isDisplayed()).toBe(true);
      expect(backButton.isEnabled()).toBe(true);
    });

    it('should allow to proceed', function() {
      expect(nextButton.isEnabled()).toBe(true);
    });

    it('should state the instructions', function() {
      expect(element(By.id('instructions')).getText()).toEqual('Select the components to install');
    });

    it('should display a panel for each component', function() {
      for (var key in components) {
        expect(components[key].panel.isDisplayed()).toBe(true);
      }
    });

    describe('virtualbox panel', function() {
      let vbox = components.virtualbox;

      it('should display a correct name', function() {
        expect(vbox.nameElement.isDisplayed()).toBe(true);
        expect(vbox.nameElement.getText()).toEqual(vbox.name);
      });

      it('should display a correct version', function() {
        expect(vbox.versionElement.isDisplayed()).toBe(true);
        expect(vbox.versionElement.getText()).toEqual(vbox.version);
      });

      it('should display a correct description', function() {
        expect(vbox.descriptionElement.isDisplayed()).toBe(true);
        expect(vbox.descriptionElement.getText()).toEqual(vbox.description);
      });

      it('detected installation message should be available', function() {
        expect(vbox.installedNote.isPresent()).toBe(true);
        expect(vbox.installedNote.getAttribute('innerHTML')).toMatch(messages.detected);
      });

      it('newer versions should come with a warning', function() {
        expect(vbox.newerWarning.isPresent()).toBe(true);
        expect(vbox.newerWarning.getAttribute('class')).toMatch('has-warning');
        expect(vbox.newerMessage.getAttribute('innerHTML')).toEqual(messages.newer);
      });

      it('older versions should come with an error', function() {
        expect(vbox.olderError.isPresent()).toBe(true);
        expect(vbox.olderError.getAttribute('class')).toMatch('has-error');
        expect(vbox.olderMessage.getAttribute('innerHTML')).toEqual(messages.older);
      });
    });

    describe('vagrant panel', function() {
      let vagrant = components.vagrant;

      it('should display a correct name', function() {
        expect(vagrant.nameElement.isDisplayed()).toBe(true);
        expect(vagrant.nameElement.getText()).toEqual(vagrant.name);
      });

      it('should display a correct version', function() {
        expect(vagrant.versionElement.isDisplayed()).toBe(true);
        expect(vagrant.versionElement.getText()).toEqual(vagrant.version);
      });

      it('should display a correct description', function() {
        expect(vagrant.descriptionElement.isDisplayed()).toBe(true);
        expect(vagrant.descriptionElement.getText()).toEqual(vagrant.description);
      });

      it('detected installation message should be available', function() {
        expect(vagrant.installedNote.isPresent()).toBe(true);
        expect(vagrant.installedNote.getAttribute('innerHTML')).toMatch(messages.detected);
      });

      it('newer versions should come with a warning', function() {
        expect(vagrant.newerWarning.isPresent()).toBe(true);
        expect(vagrant.newerWarning.getAttribute('class')).toMatch('has-warning');
        expect(vagrant.newerMessage.getAttribute('innerHTML')).toEqual(messages.newer);
      });

      it('older versions should come with an error', function() {
        expect(vagrant.olderError.isPresent()).toBe(true);
        expect(vagrant.olderError.getAttribute('class')).toMatch('has-error');
        expect(vagrant.olderMessage.getAttribute('innerHTML')).toEqual(messages.older);
      });
    });

    describe('cygwin panel', function() {
      let cygwin = components.cygwin;

      it('should display a correct name', function() {
        expect(cygwin.nameElement.isDisplayed()).toBe(true);
        expect(cygwin.nameElement.getText()).toEqual(cygwin.name);
      });

      it('should display a correct version', function() {
        expect(cygwin.versionElement.isDisplayed()).toBe(true);
        expect(cygwin.versionElement.getText()).toEqual(cygwin.version);
      });

      it('should display a correct description', function() {
        expect(cygwin.descriptionElement.isDisplayed()).toBe(true);
        expect(cygwin.descriptionElement.getText()).toEqual(cygwin.description);
      });
    });

    describe('cdk panel', function() {
      let cdk = components.cdk;

      it('should display a correct name', function() {
        expect(cdk.nameElement.isDisplayed()).toBe(true);
        expect(cdk.nameElement.getText()).toEqual(cdk.name);
      });

      it('should display a correct version', function() {
        expect(cdk.versionElement.isDisplayed()).toBe(true);
        expect(cdk.versionElement.getText()).toEqual(cdk.version);
      });

      it('should display a correct description', function() {
        expect(cdk.descriptionElement.isDisplayed()).toBe(true);
        expect(cdk.descriptionElement.getText()).toEqual(cdk.description);
      });
    });

    describe('devstudio panel', function() {
      let devstudio = components.devstudio;

      it('should display a correct name', function() {
        expect(devstudio.nameElement.isDisplayed()).toBe(true);
        expect(devstudio.nameElement.getText()).toEqual(devstudio.name);
      });

      it('should display a correct version', function() {
        expect(devstudio.versionElement.isDisplayed()).toBe(true);
        expect(devstudio.versionElement.getText()).toEqual(devstudio.version);
      });

      it('should display a correct description', function() {
        expect(devstudio.descriptionElement.isDisplayed()).toBe(true);
        expect(devstudio.descriptionElement.getText()).toEqual(devstudio.description);
      });
    });

    describe('jdk panel', function() {
      let jdk = components.jdk;

      it('should display a correct name', function() {
        expect(jdk.nameElement.isDisplayed()).toBe(true);
        expect(jdk.nameElement.getText()).toEqual(jdk.name);
      });

      it('should display a correct version', function() {
        expect(jdk.versionElement.isDisplayed()).toBe(true);
        expect(jdk.versionElement.getText()).toEqual(jdk.version);
      });

      it('should display a correct description', function() {
        expect(jdk.descriptionElement.isDisplayed()).toBe(true);
        expect(jdk.descriptionElement.getText()).toEqual(jdk.description);
      });
    });
  });
});
