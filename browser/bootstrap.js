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

function openAboutWindow() {

  let aboutWindow = new BrowserWindow({
    parent: remote.getCurrentWindow(),
    modal: true,
    width: 500,
    height: 300,
    'autoHideMenuBar': true,
    resizable: false,
    show: false
  });
  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the about.html of the app
  aboutWindow.loadURL(`file://${baseLocation}/../browser/about.html`);
  aboutWindow.setMenu(null);
  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });
}

const aboutItem = new MenuItem({
  label: 'About',
  click: openAboutWindow
});

const helpSeparator = new MenuItem({
  type: 'separator'
});

function restoreMenu() {
  menu = new Menu();
  menu.append(toggleDevToolsItem);
  menu.append(inspectElementItem);
  menu.append(helpSeparator);
  menu.append(aboutItem);
}

restoreMenu();

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  rightClickPosition = {x: e.x, y: e.y};
  menu.popup(remote.getCurrentWindow());
}, false);
