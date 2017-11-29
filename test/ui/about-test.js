'use strict';

let context = { pageName: 'About' };
let breadcrumbBase = require('./breadcrumbs-base');

describe('About Page', function() {
  let nextButton;

  beforeAll(function() {
    browser.setLocation('about')
      .then(function() {
        nextButton = element(By.id('welcomeNextButton'));
      });
  });

  it('should display `Next` button to continue to next page', function() {
    expect(nextButton.isDisplayed()).toBe(true);
    expect(nextButton.isEnabled()).toBe(true);
  });

  breadcrumbBase.describeBreadcrumbs(context);
});
