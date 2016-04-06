'use strict';

import main from 'browser/main';
import progressBar from 'browser/directives/progressBar';

describe('progressBar directive', function() {

  let scope, element;

  //load main module
  beforeEach(module('devPlatInstaller'));

  //load templates
  beforeEach(module('directives/breadcrumbs.html'));
  beforeEach(module('pages/install/install.html'));

  //inject and compile the directive
  beforeEach(inject(function($rootScope, $state, $compile) {
    scope = $rootScope;
    $state.go('install');
    element = angular.element('<progress-bar name="cdk" current="15" min="0" max="100" label="CDK" desc="Downloading"></progress-bar>');

    $compile(element)(scope);
    scope.$digest();
  }));

  it('generates a div with the set attributes', function() {
    expect(element.get(0).tagName.toLowerCase()).toBe('div');
    expect(element.attr('name')).toBe('cdk');
    expect(element.attr('current')).toBe('15');
    expect(element.attr('min')).toBe('0');
    expect(element.attr('max')).toBe('100');
    expect(element.attr('label')).toBe('CDK');
    expect(element.attr('desc')).toBe('Downloading');
  });

  it('generates a progress description element', function() {
    expect(element.find('div.progress-description span').length).toBe(2);
  });

  it('generates a labeled progress bar', function() {
    let progress = element.find('div.progress');
    expect(progress.length).toBe(1);
    expect(progress.hasClass('progress-label-top-right')).toBe(true);

    let bar = progress.find('div.progress-bar');
    expect(bar.length).toBe(1);
    expect(bar.find('span').length).toBe(1);
  });

  it('passes attributes to the progress bar', function() {
    let bar = element.find('div.progress-bar');
    expect(bar.attr('role')).toBe('progressbar');
    expect(bar.attr('aria-valuemin')).toBe('0');
    expect(bar.attr('aria-valuemax')).toBe('100');
    expect(bar.attr('aria-valuenow')).toBe('15');
    expect(bar.attr('style')).toBe('width: 15%;');
  });
});
