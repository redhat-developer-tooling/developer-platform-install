'use strict';

const pageIndex = 3;
const name = "Login Page";

const user = 'devsuite.test@gmail.com';
const pass = 'Devsuite';
let usernameField, passwordField, loginButton;

function setup() {
  browser.driver.wait(protractor.until.elementLocated(By.id('loginButton')), 20000)
  .then(function(elm) {
    loginButton = elm;
    usernameField = element(By.id('username'));
    passwordField = element(By.id('password'));
  });
}

function testPage() {
  it('should log in', function() {
    usernameField.sendKeys(user);
    passwordField.sendKeys(pass);
    loginButton.click();
  });
}


module.exports = {
  'name': name,
  'pageIndex': pageIndex,
  'setup': setup,
  'testPage': testPage
};
