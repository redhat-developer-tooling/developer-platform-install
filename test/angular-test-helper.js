const { JSDOM } = require('jsdom');


global.document = new JSDOM('<html><head><script></script></head><body></body></html>');
global.window = global.document.window;
global.Node = global.window.Node;

global.window.mocha = {};
global.window.before = before;
global.window.after = after;
global.window.beforeEach = beforeEach;
global.window.afterEach = afterEach;

/*
 * Only for NPM users
 */
require('angular/angular');
require('angular-mocks');

global.angular = global.window.angular;
global.inject = global.angular.mock.inject;
global.ngModule = global.angular.mock.module;
