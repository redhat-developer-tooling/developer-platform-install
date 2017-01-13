'use strict';

let path = require('path');

let context = { pageName: 'Download & Install' };
let breadcrumbBase = require('./breadcrumbs-base');
let requirements = require(path.join(rootPath, 'requirements-' + process.platform + '.json'));

describe('Installation page', function() {
  let components = {
    virtualbox: requirements['virtualbox.exe'],
    cygwin: requirements['cygwin.exe'],
    cdk: requirements['cdk.zip'],
    jdk: requirements['jdk.msi'],
    devstudio: requirements['jbds.jar']
  };

  beforeAll(function() {
    browser.ignoreSynchronization = true;
    browser.setLocation('install')
    .then(function() {
      for (var key in components) {
        components[key].name = components[key].name.toUpperCase();
        components[key].panel = element(By.id(key + '-progress'));
        components[key].descriptionPane = components[key].panel.element(By.className('progress-description'));
        components[key].progress = components[key].panel.element(By.className('progress-bar'));
      }
    });
  });

  breadcrumbBase.describeBreadcrumbs(context);

  it('should display progress panel for each component', function() {
    for (var key in components) {
      expect(components[key].panel.isDisplayed()).toBe(true);
    }
  });

  describe('ProgressBar directive', function() {

    describe('Description pane', function() {

      it('should be displayed for each progress panel', function() {
        for (var key in components) {
          expect(components[key].descriptionPane.isDisplayed()).toBe(true);
        }
      });

      it('should each display a correct component name', function() {
        for (var key in components) {
          let productName = components[key].descriptionPane.element(By.className('product-name'));
          expect(productName.isDisplayed()).toBe(true);
          expect(productName.getText()).toEqual(components[key].name);
        }
      });

      it('should each display a correct component version', function() {
        for (var key in components) {
          let productVersion = components[key].descriptionPane.all(By.className('product-version')).first();
          expect(productVersion.isDisplayed()).toBe(true);
          expect(productVersion.getText()).toEqual(components[key].version);
        }
      });

      it('should each display a correct component description', function() {
        for (var key in components) {
          let productDesc = components[key].descriptionPane.element(By.tagName('div'));
          expect(productDesc.isDisplayed()).toBe(true);
          expect(productDesc.getText()).toEqual(components[key].description);
        }
      });
    });

    describe('Progress bar', function() {

      it('should be displayed for each progress panel', function() {
        for (var key in components) {
          expect(components[key].progress.isDisplayed()).toBe(true);
        }
      });

      it('should each go from 0 to 100%', function() {
        for (var key in components) {
          expect(components[key].progress.getAttribute('aria-valuemin')).toEqual('0');
          expect(components[key].progress.getAttribute('aria-valuemax')).toEqual('100');
        }
      });
    });
  });
});
