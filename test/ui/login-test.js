'use strict';

let webdriver = browser.driver;
let ACCOUNT_URL = '/account';
let PAGE_TITLE = 'Red Hat Developer Platform Installer';
let BAD_USERNAME = "badusername1";
let BAD_PASSWORD = "badpassword1";

describe('Login page', function() {
  let usernameField, passwordField, loginButton;

  beforeAll(function() {
    webdriver.wait(protractor.until.elementLocated(By.id('loginButton')), 10000)
    .then(function(elm) {
      loginButton = elm;
      usernameField = element(By.id('username'));
      passwordField = element(By.id('password'));
    });
  });

  it('Inital page URL should be correct', function() {
    expect(browser.getLocationAbsUrl()).toEqual(ACCOUNT_URL);
  });

  it('Initial page title should match', function() {
    expect(browser.getTitle()).toEqual(PAGE_TITLE);
  });

  it('Login button should be disabled until user enters name/password', function() {
    expect(loginButton.isEnabled()).toBe(false);
  });

  it('Should display links for forgotten username or password', function() {
    expect(element(By.id('usernameLink')).isDisplayed()).toBe(true);
  });

  it('Should contain a Register button', function() {
    expect(element(By.id('registerLink')).isDisplayed()).toBe(true);
  });

  describe('Login form', function() {
    let usernameStatus, passwordStatus;

    beforeAll(function() {
      usernameStatus = element(By.id('usernameStatus'));
      passwordStatus = element(By.id('passwordStatus'));
    });

    afterAll(function() {
      usernameField.clear();
      passwordField.clear();
    });

    it('Username field should be focused', function() {
      let activeElmId = webdriver.switchTo().activeElement().getAttribute('id');
      expect(activeElmId).toEqual(usernameField.getAttribute('id'));
    });

    it('Error messages should be hidden by default', function() {
      expect(usernameStatus.isDisplayed()).toBe(false);
      expect(passwordStatus.isDisplayed()).toBe(false);
    });

    it('Leaving empty username field should display an error', function() {
      passwordField.sendKeys('');
      expect(usernameStatus.isDisplayed()).toBe(true);
    });

    it('Leaving empty password field should display an error', function() {
      usernameField.sendKeys('');
      expect(usernameStatus.isDisplayed()).toBe(true);
    });

    it('Entering a username should hide the appropriate error', function() {
      usernameField.sendKeys('user');
      expect(usernameStatus.isDisplayed()).toBe(false);
      usernameField.clear();
    });

    it('Entering a password should hide the appropriate error', function() {
      passwordField.sendKeys('password');
      expect(passwordStatus.isDisplayed()).toBe(false);
      passwordField.clear();
    });

    it('Login button should be enabled after user enters name and password', function() {
      usernameField.sendKeys('username');
      passwordField.sendKeys('password');
      expect(loginButton.isEnabled()).toEqual(true);
    });
  });

  describe('Invalid login information', function() {

    beforeAll(function() {
      usernameField.sendKeys(BAD_USERNAME);
      passwordField.sendKeys(BAD_PASSWORD);
    });

    afterAll(function() {
      usernameField.clear();
      passwordField.clear();
    });

    it('Should display an error when attempting to log in', function() {
      loginButton.click();
      browser.wait(protractor.until.elementLocated(By.id('invalidLoginError')), 2000);
      expect(element(By.id('invalidLoginIcon')).isDisplayed()).toBe(true);
      expect(element(By.id('invalidLoginMessage')).isDisplayed()).toBe(true);
    });
  });

});
