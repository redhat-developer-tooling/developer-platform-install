'use strict';

let path = require('path');

let context = { pageName: 'Download & Install' };
let breadcrumbBase = require('./breadcrumbs-base');
let loadMetadata = require('../../browser/services/metadata');
let requirements = loadMetadata(require(path.join(rootPath, 'requirements.json')), process.platform);

for (var key in requirements) {
  if (requirements[key].bundle === 'tools' || requirements[key].defaultOption && requirements[key].defaultOption === 'detected') {
    delete requirements[key];
  }
}
// Hyper-V has no progress bar
delete requirements.hyperv;

describe('Installation page', function() {

  beforeAll(function() {
    browser.ignoreSynchronization = true;
    browser.setLocation('install').then(function() {
      for (var key in requirements) {
        requirements[key].name = requirements[key].name.toUpperCase();
        requirements[key].panel = element(By.id(key + '-progress'));
        requirements[key].descriptionPane = requirements[key].panel.element(By.className('progress-description'));
        requirements[key].progress = requirements[key].panel.element(By.className('progress-bar'));
        requirements[key].statusPane = requirements[key].panel.element(By.className('progress-status'));
      }
    });
  });

  breadcrumbBase.describeBreadcrumbs(context);

  it('should display progress panel for each component', function() {
    for (var key in requirements) {
      expect(requirements[key].panel.isDisplayed()).toBe(true);
    }
  });

  describe('ProgressBar directive', function() {

    describe('Description pane', function() {

      it('should be displayed for each progress panel', function() {
        for (var key in requirements) {
          expect(requirements[key].descriptionPane.isDisplayed()).toBe(true);
        }
      });

      it('should each display a correct component name', function() {
        for (var key in requirements) {
          let productName = requirements[key].descriptionPane.element(By.className('product-name'));
          expect(productName.isDisplayed()).toBe(true);
          expect(productName.getText()).toEqual(requirements[key].name);
        }
      });

      it('should each display a correct component version', function() {
        for (var key in requirements) {
          let productVersion = requirements[key].descriptionPane.all(By.className('product-version')).first();
          expect(productVersion.isDisplayed()).toBe(true);
          expect(productVersion.getText()).toEqual(requirements[key].version);
        }
      });

      it('should each display a correct component description', function() {
        for (var key in requirements) {
          let productDesc = requirements[key].descriptionPane.element(By.id('productDescription'));
          expect(productDesc.isDisplayed()).toBe(true);
          expect(productDesc.getText()).toEqual(requirements[key].description);
        }
      });

      it('should each display a correct component status', function() {
        for (var key in requirements) {
          let status = requirements[key].statusPane.element(By.tagName('div'));
          expect(status.isDisplayed()).toBe(true);
        }
      });
    });

    describe('Progress bar', function() {

      it('should be displayed for each progress panel', function() {
        for (var key in requirements) {
          expect(requirements[key].progress.isDisplayed()).toBe(true);
        }
      });

      it('should each go from 0 to 100%', function() {
        for (var key in requirements) {
          expect(requirements[key].progress.getAttribute('aria-valuemin')).toEqual('0');
          expect(requirements[key].progress.getAttribute('aria-valuemax')).toEqual('100');
        }
      });
    });
  });
});
