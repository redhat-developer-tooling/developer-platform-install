'use strict';

import mainModule from './main';
import { remote } from 'electron';

angular.element(document).ready(function() {
  angular.bootstrap(document, [mainModule.name], { strictDi: true });
});

// Importing this adds a right-click menu with 'Inspect Element' option
const {BrowserWindow} = require('electron').remote;
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

const separator = new MenuItem({
  type: 'separator'
});

const help = new MenuItem({
  label: 'Help',
  accelerator: 'f1',
  click: () => {
    require('electron').shell.openExternal('https://access.redhat.com/documentation/en/red-hat-development-suite/');
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
  menu.append(separator);
  menu.append(help);
}
