'use strict';

const pageIndex = 4;
const name = "Install Page";

function setup(common = require('./common')) {
  if (!common.error) {
    browser.driver.wait(protractor.until.elementLocated(By.id(Object.keys(common.progressBars)[0] + '-progress')), 20000)
    .then(() => {
      for (var key in common.progressBars) {
        if (common.progressBars[key] === 'install') {
          common.progressBars[key] = element(By.id(key + '-progress'));
        }
      }
    });
  }
}

function testPage(common = require('./common'), timeout = 45*60*1000) {
  if (!common.error) {
    it('should display a progress bar for each selected component', function() {
      for (let key in common.progressBars) {
        expect(common.progressBars[key].isDisplayed()).toBe(true);
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
            for (var key in common.progressBars) {
              common.progressBars[key].getText().then(function(text) {
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
    }, 50*60*1000);
  }
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
