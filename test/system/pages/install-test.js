'use strict';

const pageIndex = 5;
const name = "Install Page";

let progress;

function setup(common = require('./common')) {
  if (!common.error) {
    browser.driver.wait(protractor.until.elementLocated(By.id('progress')), 20000)
    .then(() => {
      progress = element(By.id('progress'));
    });
  }
}

function testPage(common = require('./common'), timeout = 45*60*1000) {
  if (!common.error) {
    it('should display a progress bar', function() {
      for (let key in common.progressBars) {
        expect(progress.isDisplayed()).toBe(true);
      }
    });

    it('should not fail during the installation', function(done) {
      let startTime = new Date().getTime();

      let check = function() {
        browser.getCurrentUrl().then(function(url) {
          //Installation finished
          if (url.endsWith('/start')) {
            clearInterval(check);
            done();
          //Timed out
          } else if (new Date().getTime() - startTime > timeout) {
            clearInterval(check);
            fail(timeout/60000 + ' minute timeout exceeded');
            done();
          } else {
            //Check if something failed
            progress.getText().then(function(text) {
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
        });
      };

      setInterval(check, 2000);
    }, 50*60*1000);
  }
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
