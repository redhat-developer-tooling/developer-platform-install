'use strict';

let context = { pageName: 'Target Folder' };
let path = require('path');
let breadcrumbBase = require('./breadcrumbs-base');

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

  it('should set the default target folder to c:\\DevelopmentSuite', function() {
    expect(locationField.getAttribute('value')).toEqual(path.join('c:', 'DevelopmentSuite'));
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

  breadcrumbBase.describeBreadcrumbs(context);

  describe('validation', function() {
    let existingFolderStatus,
      createFolderStatus,
      pathWithSpacesStatus;

    beforeAll(function() {
      existingFolderStatus = element(By.id('existingFolderStatus'));
      createFolderStatus = element(By.id('createFolderStatus'));
      pathWithSpacesStatus = element(By.id('pathWithSpacesStatus'));
    });

    beforeEach(function() {
      locationField.clear();
    });

    it('should not allow an empty path', function() {
      let pathRequiredStatus = element(By.id('pathRequiredStatus'));
      expect(pathRequiredStatus.isDisplayed()).toBe(true);
      expect(pathRequiredStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    function testPathFomatWith(sequence) {
      locationField.sendKeys('c:\\path\\path'+sequence);

      let pathFormatStatus = element(By.id('pathFormatStatus'));
      expect(pathFormatStatus.isDisplayed()).toBe(true);
      expect(pathFormatStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    }

    it('should not allow path with "\\\\"', function() {
      testPathFomatWith('\\\\');
    });

    it('should not allow path with ":"', function() {
      testPathFomatWith(':');
    });

    it('should not allow path with "/"', function() {
      testPathFomatWith('/');
    });

    it('should not allow path with "?"', function() {
      testPathFomatWith('?');
    });

    it('should not allow path with \'"\'', function() {
      testPathFomatWith('"');
    });

    it('should not allow path with ":"', function() {
      testPathFomatWith(':');
    });

    it('should not allow path with "<"', function() {
      testPathFomatWith('<');
    });

    it('should not allow path with ">"', function() {
      testPathFomatWith('>');
    });

    it('should not allow path with "|"', function() {
      testPathFomatWith('|');
    });

    it('should not allow path with "\\"', function() {
      testPathFomatWith('\\\\');
    });

    it('should not allow a non-existing drive I:', function() {
      locationField.sendKeys('I:\\path\\path');

      let pathDriveStatus = element(By.id('pathDriveStatus'));
      expect(pathDriveStatus.isDisplayed()).toBe(true);
      expect(pathDriveStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    it('should not allow a non-absolute path', function() {
      locationField.sendKeys('path/path');

      let invalidPathStatus = element(By.id('invalidPathStatus'));
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

      let pathTooLongStatus = element(By.id('pathTooLongStatus'));
      expect(pathTooLongStatus.isDisplayed()).toBe(true);
      expect(pathTooLongStatus.getAttribute('class')).toMatch('help-block has-error');
      expect(nextButton.isEnabled()).toBe(false);
    });

    it('should warn when the selected folder exists', function() {
      locationField.sendKeys('c:\\');

      expect(existingFolderStatus.isDisplayed()).toBe(true);
      expect(existingFolderStatus.getAttribute('class')).toMatch('help-block');
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
