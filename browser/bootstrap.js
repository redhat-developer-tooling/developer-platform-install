'use strict';

import mainModule from './main';

angular.element(document).ready(function() {
  angular.bootstrap(document, [mainModule.name], { strictDi: true });
});

// Importing this adds a right-click menu with 'Inspect Element' option
const { remote } = require('electron');
const { Menu, MenuItem } = remote;

let rightClickPosition = null;

var menu;
const toggleDevToolsItem = new MenuItem({
  label: 'Toggle Development Tools',
  accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
  click: () => {
    remote.getCurrentWindow().toggleDevTools();
  }
});
const inspectElementItem = new MenuItem({
  label: 'Inspect Element',
  click: () => {
    remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y);
  }
});

restoreMenu();

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  rightClickPosition = {x: e.x, y: e.y};
  menu.popup(remote.getCurrentWindow());
}, false);

function restoreMenu() {
  menu = new Menu();
  menu.append(toggleDevToolsItem);
  menu.append(inspectElementItem);
}
