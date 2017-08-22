'use strict';

const pageIndex = 5;
const name = "Start Page";

let closeButton, openStudioButton;

function setup() {
  browser.driver.wait(protractor.until.elementLocated(By.id('exit-btn')), 20000)
  .then((elm) => {
    closeButton = elm;
  });
}

function testPage(common = require('./common')) {
  if (common.progressBars.devstudio) {
    it('should have a button to open devstudio if installed', function() {
      expect(element(By.id('start-submit')).isDisplayed()).toBe(true);
    });
  }

  it('should be able to close the installer', function() {
    closeButton.click();
  });
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
