'use strict';

const pageIndex = 0;
const name = "About Page";

let nextButton;

function setup() {
  browser.driver.wait(protractor.until.elementLocated(By.id('welcomeNextButton')), 20000)
  .then((elm) => {
    nextButton = elm;
  });
}

function testPage() {
  it('should have a funtional next button', function() {
    nextButton.click();
  });
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
