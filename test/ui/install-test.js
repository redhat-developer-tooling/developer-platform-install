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
    expect(element(By.id('progress')).isDisplayed()).toBe(true);
  });
});
