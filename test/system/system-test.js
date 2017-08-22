'use strict';

let common = require('./pages/common');
let pages = common.pages,
    expectedComponents = common.expectedComponents;

// choose the expected hypervisor
let hypervisor = 'Virtualbox';
if (expectedComponents.hyperv && expectedComponents.hyperv.installedVersion) {
  hypervisor = 'Hyper-v';
}

describe('System Tests on ' + hypervisor, function() {
  for (var i = 0; i < pages.length; i++) {
    describe(pages[i].name, function() {
      beforeAll(pages[i].setup);

      pages[i].testPage();
    });
  }
});
