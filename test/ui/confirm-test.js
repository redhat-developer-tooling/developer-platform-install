'use strict';

let humanize = require('humanize');
let context = { pageName: 'Confirmation' };
let path = require('path');
let breadcrumbBase = require('./breadcrumbs-base');
let loadMetadata = require('../../browser/services/metadata');
let requirements = loadMetadata(require(path.join(rootPath, 'transpiled', 'requirements.json')), process.platform);

for (let key in requirements) {
  if (requirements[key].bundle === 'tools') {
    delete requirements[key];
  }
}
// Hyper-V is not enabled on CI
delete requirements.hyperv;

describe('Confirmation page', function() {
  let installsize, downloadSize, backButton, nextButton, cancelButton, browseButton, confirmNote, summaryHeading;

  beforeAll(function() {
    browser.setLocation('confirm')
      .then(function() {
        for (var key in requirements) {
          requirements[key].summaryPane = element(By.id(key + '-info'));
          requirements[key].downloadStatus = element(By.id(key + '-download-status'));
          requirements[key].versionElement = element(By.id(key + '-version'));
          requirements[key].nameElement = element(By.id(key + '-name'));
        }
        installsize = element(By.id('confirm-install-size'));
        downloadSize = element(By.id('confirm-download-size'));
        backButton = element(By.id('location-back-btn'));
        nextButton = element(By.id('location-install-btn'));
        confirmNote = element(By.id('confirm-note'));
        summaryHeading = element(By.id('confirm-summary-title'));
      });
  });

  it('should have confirmation summary title', function() {
    expect(summaryHeading.isEnabled()).toBe(true);
  });

  it('should display the confirmation note', function() {
    expect(confirmNote.isEnabled()).toBe(true);
  });

  it('should display a total download & install size', function() {
    expect(installsize.isEnabled()).toBe(true);
    let sizes = [];
    let installSizes = [];
    for (let key in requirements) {
      let selectedElement = element(By.id(`${key}-download-status`));
      sizes.push(selectedElement.getText().then((text)=>{return text=='Selected to download'? requirements[key].size:0;}).catch(()=>{return 0;}));
      installSizes.push(selectedElement.getText().then((text)=>{return requirements[key].installSize;}).catch(()=>{return 0;}));
    }

    let pms = [
      Promise.all(sizes).then((results)=>{
        return results.reduce((acc,current)=>acc+current)
      }),
      Promise.all(installSizes).then((results)=>{
        return results.reduce((acc,current)=>acc+current)
      }),
    ];
    return Promise.all(pms).then((result)=>{
      expect(element(By.id('install-size-header')).getText()).toEqual(humanize.filesize(result[1]));
      expect(element(By.id('download-size-header')).getText()).toEqual(humanize.filesize(result[0]));
    });
  });

  describe('components', function() {
    for (let key in requirements) {
      if(key.selectedOption == 'install') {
        testComponentPanel(key);
      }
    }
  });

  breadcrumbBase.describeBreadcrumbs(context);
});

function testComponentPanel(key) {
  describe('Description pane', function() {
    let component = requirements[key];
    it('should display a correct name', function() {
      expect(component.nameElement.isDisplayed()).toBe(true);
      expect(component.nameElement.getText()).toEqual(component.name);
    });

    it('should display a correct version', function() {
      expect(component.versionElement.isDisplayed()).toBe(true);
      expect(component.versionElement.getText()).toEqual(component.version);
    });

    it('should each display a correct component download status', function() {
      for (var key in requirements) {
        let productDesc = requirements[key].descriptionPane.element(By.id('productDescription'));
        expect(requirements[key].downloadStatus.isDisplayed()).toBe(true);
        if(requirements[key].downloaded) {
          expect(requirements[key].downloadStatus.getText()).toEqual('Previously Downloaded');
        } else {
          expect(requirements[key].downloadStatus.getText()).toEqual('Selected to download');
        }
      }
    });
  });
};
