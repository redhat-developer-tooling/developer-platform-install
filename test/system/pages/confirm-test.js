'use strict';

const pageIndex = 3;
const name = "Confirm Page";

let nextButton;

function setup(common = require('./common')) {
  if (!common.error) {
    browser.driver.wait(protractor.until.elementLocated(By.id('confirm-install-btn')), 20000)
    .then((elm) => {
      nextButton = elm;
    });
  }
}

function testPage(common = require('./common')) {
  if (!common.error) {
    it('should display info for all selected components', function() {
      for (let key in common.progressBars) {
        if (common.progressBars[key] === 'install') {
          expect(element(By.id(key + '-info')).isDisplayed()).toBe(true);
        }
      }
    });

    it('should have a funtional next button', function() {
      nextButton.click();
    });
  }
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
