'use strict';

let path = require('path');
let target = process.env.PDKI_TEST_TARGET_FOLDER;

const name = "Location Page" + (target ? ' With Custom Target Folder' : '');
const pageIndex = 1;

let locationField, nextButton, defaultFolder;

switch (process.platform) {
  case 'win32':
    defaultFolder = path.join('C:', 'Program Files', 'DevelopmentSuite');
    break;
  case 'darwin':
    defaultFolder = '/Applications/DevelopmentSuite';
    break;
}

function setup() {
  browser.driver.wait(protractor.until.elementLocated(By.id('location-browse-input-folder')), 30000)
  .then(function(elm) {
    locationField = elm;
    nextButton = element(By.id('location-install-btn'));
  });
}

function testPage() {
  it('should have the default location set', function() {
    expect(locationField.getAttribute('value')).toEqual(defaultFolder);
  });

  if (target && target.length > 0) {
    it('should use the desired custom target folder', function() {
      locationField.clear();
      locationField.sendKeys(target);
      expect(locationField.getAttribute('value')).toEqual(target);
    });
  }

  it('should have the next button enabled', function() {
    expect(nextButton.isEnabled()).toBe(true);
    nextButton.click();
  });
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
