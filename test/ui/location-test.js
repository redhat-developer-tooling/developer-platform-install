'use strict';

let webdriver = browser.driver;
let path = require('path');

describe('Location page', function() {
  let locationField, backButton, nextButton, cancelButton, browseButton;

  beforeAll(function() {
    browser.setLocation('location')
    .then(function() {
      locationField = element(By.id('location-browse-input-folder'));
      backButton = element(By.id('location-back-btn'));
      nextButton = element(By.id('location-install-btn'));
      cancelButton = element(By.id('location-cancel-btn'));
      browseButton = element(By.id('location-browse-btn'));
    });
  });

  it('should set the default target folder to c:\\DeveloperPlatform', function() {
    expect(locationField.getAttribute('value')).toEqual(path.join('c:', 'DeveloperPlatform'));
  });

  it('should have the Browse button enabled', function() {
    expect(browseButton.isEnabled()).toBe(true);
  });

  it('should let the user proceed with default folder', function() {
    expect(nextButton.isEnabled()).toBe(true);
  });

  it('navigation buttons should be enabled', function() {
    expect(backButton.isEnabled()).toBe(true);
    expect(cancelButton.isEnabled()).toBe(true);
  });

  describe('validation', function() {
    let invalidPathStatus, existingFolderStatus, createFolderStatus,
        pathWithSpacesStatus, pathTooLongStatus;

    beforeAll(function() {
      invalidPathStatus = element(By.id('invalidPathStatus'));
      existingFolderStatus = element(By.id('existingFolderStatus'));
      createFolderStatus = element(By.id('createFolderStatus'));
      pathWithSpacesStatus = element(By.id('pathWithSpacesStatus'));
      pathTooLongStatus = element(By.id('pathTooLongStatus'));
    })

    beforeEach(function() {
      locationField.clear();
    });

    it('should not allow an empty path', function() {
      expect(invalidPathStatus.isDisplayed()).toBe(true);
      expect(invalidPathStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    it('should not allow a non-absolute path', function() {
      locationField.sendKeys('path/path');

      expect(invalidPathStatus.isDisplayed()).toBe(true);
      expect(invalidPathStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    it('should not allow a path with spaces', function() {
      locationField.sendKeys('c:\\path with spaces');

      expect(pathWithSpacesStatus.isDisplayed()).toBe(true);
      expect(pathWithSpacesStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    it('should not allow a too long path', function() {
      locationField.sendKeys('c:\\thispathisgoingtobe\\sodamnlongthatitisnotgoingto\\letme\\proceedtotheactualinstallation\\anddisplayanerror');

      expect(pathTooLongStatus.isDisplayed()).toBe(true);
      expect(pathTooLongStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    it('should warn when the selected folder exists', function() {
      locationField.sendKeys('c:\\');

      expect(existingFolderStatus.isDisplayed()).toBe(true);
      expect(existingFolderStatus.getAttribute('class')).toMatch('help-block has-warning');
      expect(nextButton.isEnabled()).toBe(true);
    });

    it('should show info that non-existing folder will be created', function() {
      locationField.sendKeys('c:\\thisfolder\\definitely\\doesnot\\exist');

      expect(createFolderStatus.isDisplayed()).toBe(true);
      expect(createFolderStatus.getAttribute('class')).toMatch('help-block');
      expect(nextButton.isEnabled()).toBe(true);
    });
  });
});
