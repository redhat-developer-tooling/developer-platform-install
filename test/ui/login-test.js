'use strict';

/* Basic POC test to verify operation of installer login screen
   when invalid username/password is entered
   ldimaggi, March 2016
   */

let webdriver = browser.driver;
let ACCOUNT_URL = '/account';
let PAGE_TITLE = 'Red Hat Developer Platform Installer';
let BAD_USERNAME = "badusername1";
let BAD_PASSWORD = "badpassword1";
var loginButton;

describe('Login', function() {

  beforeAll(function() {
    loginButton = protractor.until.elementLocated(By.className('btn-lg'))
  });

/* Simple test for page URL */
  it ('Inital page URL should be correct', function() {
    expect (browser.getLocationAbsUrl()).toEqual (ACCOUNT_URL);
  });

/* Simple test for page title */
  it ('Initial page title should match', function() {
    expect (browser.getTitle()).toEqual(PAGE_TITLE);
  });

/* At this point, the login button should be disabled */
  it ('Login button should be disabled until user enters name/password', function() {
    webdriver.wait(loginButton, 10000)
    .then(function(elm) {
      expect(elm.isEnabled()).toEqual(false);
    });
  });

describe('Bad username and password', function() {
  beforeAll(function() {
    var usernameField = element(by.id('username'));
    var passwordField = element(by.id('password'));
    usernameField.sendKeys(BAD_USERNAME);
    passwordField.sendKeys(BAD_PASSWORD);
  });

/* At this point, the login button should be enabled */
  //console.log ('Verify the login button is enabled')
  it ('Login button should be enabled after user enters name and password', function() {
    webdriver.wait(loginButton, 10000)
    .then(function(elm) {
      expect(elm.isEnabled()).toEqual(true);
    });
  });

});  /* bad password describe */

it('should return true when element is present', function() {
  var displayedLoginButton = element(By.className('btn-lg'));
  expect(displayedLoginButton.isEnabled()).toEqual(true);
  /* The loginButton is clicked twice as a workaround to what appears to be a problem
     with protractor - the first click only seems to select the button - the same
     behavior is not seen when a user manually interacts with the UI, so this
     seems like a test harness bug and not a product bug  */
  displayedLoginButton.click();
  displayedLoginButton.click();

  /* Verify that the correct error message and icon are displayed */
  webdriver.isElementPresent(By.className('pficon-error-circle-o')).then(function (isPresent) {
    isPresent = (isPresent) ? true : browser.wait(function () {
      return browser.driver.isElementPresent(By.className('pficon-error-circle-o'));
    }, 15000); //timeout after 15s
    expect(isPresent).toBe(true);
    expect (browser.driver.isElementPresent(by.xpath("//div[contains(@class, 'help-block') and contains (string(), 'Invalid account information, please try again')]"))).toBe(true);
    });

  });

}); /* outer describe */
