'use strict';

/* POC test for login UI, verify bad login fails, author ldimaggi */

let webdriver = browser.driver;
let ACCOUNT_URL = '/account';
let PAGE_TITLE = 'Red Hat Developer Platform Installer';
let BAD_USERNAME = "badusername1";
let BAD_PASSWORD = "badpassword1";

var usernameField = element(by.id('username'));
var passwordField = element(by.id('password'));
var loginButton = protractor.until.elementLocated(By.className('btn-lg'));

describe('basic ui test', function() {

/* Simple test for page URL */
  it ('Inital page URL should be correct', function() {
    console.log ('Check initial page URL');
    expect (browser.getLocationAbsUrl()).toEqual (ACCOUNT_URL);
  });

/* Simple test for page title */
  it ('Initial page title should match', function() {
    console.log ('Check initial page title');
    expect (browser.getTitle()).toEqual(PAGE_TITLE);
  });

/* At this point, the login button should be disabled */
  it ('Login button should be disabled until user enters name/password', function() {
    console.log ('Verify login button is disabled');
//    webdriver.wait(protractor.until.elementLocated(By.className('btn-lg')), 10000)
    webdriver.wait(loginButton, 10000)
    .then(function(elm) {
      expect(elm.isEnabled()).toEqual(false);
    });
  });

/* Enter invalid username and password */
  it ('Enter invalid username and password', function() {
    console.log ('Enter invalid username and password');
    usernameField.sendKeys(BAD_USERNAME);
    passwordField.sendKeys(BAD_PASSWORD);
  });

/* At this point, the login button should be enabled */
  console.log ('Verify the login button is enabled')
  it ('Login button should be enabled after user enters name and password', function() {
    webdriver.wait(loginButton, 10000)
    .then(function(elm) {
      expect(elm.isEnabled()).toEqual(true);
    });
  });

/*  --------------------------  */
it('should return true when element is present', function() {
  console.log ('Force an error by clicking the login button')
  var displayedLoginButton = element(By.className('btn-lg'));
  //sleepFor(5000);
  expect(displayedLoginButton.isEnabled()).toEqual(true);
  //sleepFor(5000);
  displayedLoginButton.click();
  displayedLoginButton.click();
  //sleepFor(5000);

  console.log ('Verify that the correct error is displayed')
  webdriver.isElementPresent(By.className('pficon-error-circle-o')).then(function (isPresent) {
    isPresent = (isPresent) ? true : browser.wait(function () {
      return browser.driver.isElementPresent(By.className('pficon-error-circle-o'));
    }, 15000); //timeout after 15s
    expect(browser.driver.isElementPresent(By.className('pficon-error-circle-o'))).toBe(true);
    expect (browser.driver.isElementPresent(by.xpath("//div[contains(@class, 'help-block') and contains (string(), 'Invalid account information, please try again')]"))).toBe(true);
    });

  });

});

