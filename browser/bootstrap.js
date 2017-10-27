'use strict';

import mainModule from './main';
import { remote } from 'electron';

angular.element(document).ready(function() {
  angular.bootstrap(document, [mainModule.name], { strictDi: true });
});

// Determine version
const semver = require('semver');
let version = remote.app.getVersion();
let shortVersion = `${semver.major(version)}.${semver.minor(version)}`;

// Importing this adds a right-click menu with 'Inspect Element' option
const { BrowserWindow, TouchBar } = require('electron').remote;
const { Menu, MenuItem } = remote;
const {TouchBarLabel, TouchBarButton, TouchBarSpacer} = TouchBar;

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
    useContentSize: true,
    width: 565,
    height: 355,
    'autoHideMenuBar': true,
    resizable: false,
    show: false
  });

  const documentation = new TouchBarButton({
    label: 'Documentation',
    click: () => {
      require('electron').shell.openExternal(`https://access.redhat.com/documentation/en/red-hat-development-suite?version=${shortVersion}`);
    }
  });

  const releaseNotes = new TouchBarButton({
    label: 'Release Notes',
    click: () => {
      require('electron').shell.openExternal(`https://access.redhat.com/documentation/en-us/red_hat_development_suite/${shortVersion}/html/release_notes_and_known_issues/`);
    }
  });

  const issues = new TouchBarButton({
    label: 'Report Issues',
    click: () => {
      require('electron').shell.openExternal(`https://github.com/redhat-developer-tooling/developer-platform-install/blob/master/CONTRIBUTING.md#reporting-an-issue`);
    }
  });

  const closeDialogTouch = new TouchBarButton({
    label: 'Close',
    click: () => {
      aboutWindow.close();
    }
  });

  const touchBar = new TouchBar([documentation, releaseNotes, issues, new TouchBarSpacer({size: 'large'}), closeDialogTouch]);

  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the about.html of the app
  aboutWindow.loadURL(`file://${baseLocation}/about.html`);
  aboutWindow.setTouchBar(touchBar);
  aboutWindow.setMenu(null);
  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });
}

const aboutItem = new MenuItem({
  label: 'About Red Hat Development Suite',
  click: openAboutWindow
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

const helpTouch = new TouchBarButton({
  label: 'Help',
  click: () => {
    require('electron').shell.openExternal('https://access.redhat.com/documentation/en/red-hat-development-suite/');
  }
});

const aboutTouch = new TouchBarButton({
  label: 'About',
  click: openAboutWindow
});

const exitTouch = new TouchBarButton({
  label: 'Quit',
  click: () => {
    require('electron').remote.getCurrentWindow().close();
  }
});

const versionLabel  = new TouchBarLabel({
  label: `Version: ${version}`
})

remote.getCurrentWindow().setTouchBar(new TouchBar([exitTouch, new TouchBarSpacer({size: 'large'}), helpTouch, aboutTouch, new TouchBarSpacer({size: 'small'}), versionLabel]));

function restoreMenu() {
  menu = new Menu();
  menu.append(toggleDevToolsItem);
  menu.append(inspectElementItem);
  menu.append(separator);
  menu.append(help);
  menu.append(separator);
  menu.append(aboutItem);
}

restoreMenu();

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  rightClickPosition = {x: e.x, y: e.y};
  menu.popup(remote.getCurrentWindow());
}, false);
