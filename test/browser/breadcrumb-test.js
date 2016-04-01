'use strict';

import main from 'browser/main';
import breadcrumb from 'browser/directives/breadcrumb';

describe('breadcrumb directive', function() {

  //don't change the ordering of the names in this array
  let names = ['Install Setup', 'Confirmation', 'Download & Install', 'Get Started'];
  let scope, element;

  //load main module
  beforeEach(module('devPlatInstaller'));

  //load templates
  beforeEach(module('directives/breadcrumbs.html'));
  beforeEach(module('pages/account/account.html'));
  beforeEach(module('pages/confirm/confirm.html'));
  beforeEach(module('pages/install/install.html'));
  beforeEach(module('pages/start/start.html'));

  //inject and compile the directive
  beforeEach(inject(function($rootScope, $compile) {
    element = angular.element('<breadcrumb></breadcrumb>');
    scope = $rootScope;
    $compile(element)(scope);
    scope.$digest();
  }));

  it('should generate a breadcrumb for each step', function() {
    let breadcrumbs = element.find('li span');

    expect(breadcrumbs.length).toBe(4);
  });

  it('should assign correct names to the steps', function() {
    let breadcrumbs = element.find('li span');
    breadcrumbs.each(function(index) {
      expect($(this).text()).toBe(names[index]);
    });
  })

  it('should activate the initial breadcrumb', function() {
    let breadcrumb = element.find('li.active span');

    expect(breadcrumb.length).toBe(1);
    expect(breadcrumb.text()).toBe(names[0]);
  });

  it('should set the last breadcrumb as end', function() {
    let breadcrumb = element.find('li.end span');

    expect(breadcrumb.length).toBe(1);
    expect(breadcrumb.text()).toBe(names[3]);
  });

  describe('when changing pages', function() {
    let state, compile;

    //change page and recompile the directive
    function goToPage(name) {
      state.go(name);
      compile(element)(scope);
      scope.$digest();
    }

    beforeEach(inject(function($state, $compile) {
      element = angular.element('<breadcrumb></breadcrumb>');
      state = $state;
      compile = $compile;
    }));

    it('should activate the "confirm" breadcrumb on confirmation page', function() {
      goToPage('confirm');
      let breadcrumb = element.find('li.active span');

      expect(breadcrumb.length).toBe(1);
      expect(breadcrumb.text()).toBe(names[1]);
    });

    it('should activate the "D&I" breadcrumb on installation page', function() {
      goToPage('install');
      let breadcrumb = element.find('li.active span');

      expect(breadcrumb.length).toBe(1);
      expect(breadcrumb.text()).toBe(names[2]);
    });

    it('should activate the "start" breadcrumb on get started page', function() {
      goToPage('start');
      let breadcrumb = element.find('li.active span');

      expect(breadcrumb.length).toBe(1);
      expect(breadcrumb.text()).toBe(names[3]);
    });
  });
});
