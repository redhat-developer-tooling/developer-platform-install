'use strict';

let context = { pageName: 'Get Started' };
let breadcrumbBase = require('./breadcrumbs-base');

describe('Getting Started Page', function() {
  let devstudioButton, closeButton, quickstartLink, installAlert;

  beforeAll(function() {
    browser.setLocation('start')
      .then(function() {
        // devstudioButton = element(By.id('start-submit'));
        // closeButton = element(By.id('exit-btn'));
        installAlert = element(By.id('install-alert'));
      });
  });

  // it('should display a button to start devstudio', function() {
  //   expect(devstudioButton.isDisplayed()).toBe(true);
  //   expect(devstudioButton.isEnabled()).toBe(true);
  // });

  // it('should display a button to close the installer', function() {
  //   expect(closeButton.isDisplayed()).toBe(true);
  //   expect(closeButton.isEnabled()).toBe(true);
  // });

  it('should display a alert to a mention if successfull installation', function() {
    expect(installAlert.isDisplayed()).toBe(true);
  });

  breadcrumbBase.describeBreadcrumbs(context);
});
