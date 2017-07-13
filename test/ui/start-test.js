'use strict';

let context = { pageName: 'Get Started' };
let breadcrumbBase = require('./breadcrumbs-base');

describe('Getting Started Page', function() {
  let devstudioButton, closeButton, quickstartLink;

  beforeAll(function() {
    browser.setLocation('start')
      .then(function() {
        devstudioButton = element(By.id('start-submit'));
        closeButton = element(By.id('exit-btn'));
        quickstartLink = element(By.id('quickstart-link'));
      });
  });

  it('should display a button to start devstudio', function() {
    expect(devstudioButton.isDisplayed()).toBe(true);
    expect(devstudioButton.isEnabled()).toBe(true);
  });

  it('should display a button to close the installer', function() {
    expect(closeButton.isDisplayed()).toBe(true);
    expect(closeButton.isEnabled()).toBe(true);
  });

  it('should display a link to a quickstart on RHD site', function() {
    expect(quickstartLink.isDisplayed()).toBe(true);
    expect(quickstartLink.isEnabled()).toBe(true);
  });

  breadcrumbBase.describeBreadcrumbs(context);
});
