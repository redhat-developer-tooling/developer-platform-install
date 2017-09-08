'use strict';
let humanize = require('humanize');

let path = require('path');

let context = { pageName: 'Confirmation' };
let breadcrumbBase = require('./breadcrumbs-base');
let loadMetadata = require('../../browser/services/metadata');
let requirements = loadMetadata(require(path.join(rootPath, 'requirements.json')), process.platform);
let conditions = protractor.ExpectedConditions;

for (let key in requirements) {
  if (requirements[key].bundle === 'tools') {
    delete requirements[key];
  }
}
// Hyper-V is not enabled on CI
delete requirements.hyperv;

const messages = {
  detected: 'Using detected version',
  older: 'Older than required!',
  newer: 'Newer than required!'
};

describe('Confirm page', function confimPage() {
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

    let footer, cancelButton, backButton, installSizeFooter;

    beforeAll(function() {
      browser.wait(conditions.invisibilityOf(element(By.id('detection-info'))))
        .then(function() {
          for (let key in requirements) {
            requirements[key].name = requirements[key].name.toUpperCase();
            requirements[key].panel = element(By.id(key + '-panel'));
            requirements[key].nameElement = element(By.id(key + '-name'));
            requirements[key].versionElement = element(By.id(key + '-version'));
            requirements[key].sizeElement = element(By.id(key + '-size'));
            requirements[key].descriptionElement = element(By.id(key + '-description'));

            if(key === 'virtualbox') {
              requirements[key].installedNote = element(By.id(key + '-installed-note'));
              requirements[key].newerWarning = element(By.id(key + '-newer-warning'));
              requirements[key].newerMessage = element(By.id(key + '-newer-message'));
              requirements[key].olderWarning = element(By.id(key + '-older-warning'));
              requirements[key].olderMessage = element(By.id(key + '-older-message'));
            }
          }

          footer = element(By.id('footer-navigation'));
          cancelButton = element(By.id('confirm-cancel-btn'));
          backButton = element(By.id('confirm-back-btn'));
          installSizeFooter = element(By.className('size-footer'));
        });
    });

    //scoll down and select Java if it is deselected by default so that all panels appear on install screen
    afterAll(function() {
      let checkbox = requirements.jdk.panel.all(By.model('item.selectedOption')).first();
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
      for (let key in requirements) {
        expect(requirements[key].panel.isDisplayed()).toBe(true);
      }
    });

    it('should display a total install size', function() {
      expect(installSizeFooter.isEnabled()).toBe(true);
      let finalSize = 0;
      for (var key in requirements) {
        if(requirements[key].defaultOption === undefined || requirements[key].defaultOption === 'install') {
          finalSize += parseFloat(requirements[key].size);
        }
      }
      expect(installSizeFooter.element(By.id('install-size-footer')).getText()).toEqual(humanize.filesize(finalSize));
    });

    describe('components', function() {
      for (let key in requirements) {
        testComponentPanel(key);
      }
    });
  });
});

function testComponentPanel(key) {
  describe(key + ' panel', function() {
    let component = requirements[key];

    it('should display a correct name', function() {
      expect(component.nameElement.isDisplayed()).toBe(true);
      expect(component.nameElement.getText()).toEqual(component.name);
    });

    it('should display a correct version', function() {
      expect(component.versionElement.isDisplayed()).toBe(true);
      expect(component.versionElement.getText()).toEqual(component.version);
    });

    it('should display a correct size', function() {
      if (component.size > 0) {
        expect(component.sizeElement.isDisplayed()).toBe(true);
        expect(component.sizeElement.getText()).toEqual(humanize.filesize(component.size));
      } else {
        expect(component.sizeElement.isDisplayed()).toBe(false);
      }
    });

    it('should display a correct description', function() {
      expect(component.descriptionElement.isDisplayed()).toBe(true);
      expect(component.descriptionElement.getText()).toEqual(component.description);
    });

    if (key === 'virtualbox') {
      it('detected installation message should be available', function() {
        expect(component.installedNote.isPresent()).toBe(true);
        expect(component.installedNote.getAttribute('innerHTML')).toMatch(messages.detected);
      });

      it('newer versions should come with a warning', function() {
        expect(component.newerWarning.isPresent()).toBe(true);
        expect(component.newerWarning.getAttribute('class')).toMatch('has-warning');
        expect(component.newerMessage.getAttribute('innerHTML')).toEqual(messages.newer);
      });

      it('older versions should come with a warning', function() {
        expect(component.olderWarning.isPresent()).toBe(true);
        expect(component.olderWarning.getAttribute('class')).toMatch('has-warning');
        expect(component.olderMessage.getAttribute('innerHTML')).toEqual(messages.older);
      });
    }
  });
}
