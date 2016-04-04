# developer-platform-install

Red Hat Developer Platform Installer
====================================

[![Build Status](https://travis-ci.org/redhat-developer-tooling/developer-platform-install.svg?branch=master)](https://travis-ci.org/redhat-developer-tooling/developer-platform-install)

Architecture
------------

This installer is built on Windows using [Electron](http://electron.atom.io/).

You will also require the [Node.js, NPM](https://nodejs.org/), [Gulp](http://gulpjs.com/) and [jspm](http://jspm.io/).

Building the installer
----------------------

In order to build the installer, you'll need to install some tools.

1. Download and install Node for Windows from <https://nodejs.org/en/download/>. Pick the MSI installer.

2. Download and install MS Visual Studio Express 2015 from <https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx> (pick the Express for Desktop installer) or Microsoft Visual C++ 2010 SP1 Redistributable Package from <http://www.microsoft.com/en-us/download/details.aspx?id=8328>

3. Download and install Python 2.7.x for Windows from <https://www.python.org/downloads/release/>

4. Edit your "Path" by going to the "System" Control Panel, "Advanced system settings", "Environment Variables". Add _C:\Program Files\nodejs;C:\Users\<username>\App Data\Roaming\npm_ to the "Variable value".

Note that your system might have an "AppData" (no space) instead of "App Data" (with space) folder, so make sure you use the correct path for your system.

5. Install Gulp and jspm:

    ```
    npm install -g gulp jspm
    ```

6. Install all dependencies:

    ```
    npm install
    ```

If either of the above steps fail, try deleting the c:\Users\<username>\.electron folder.

7. Run the application using `npm start` or `gulp run`.

8. Build a Windows binary and run it:

    ```
    gulp
    dist/DeveloperPlatformInstaller-win32-x64/DeveloperPlatformInstaller.exe
    ```

If your npm install gets corrupted (or out of date) and you can't build, you can try cleaning leftover modules by deleting these files/folders:

    ```
    node_modules/ 
    browser/jspm_packages/
    browser/config.js
    ```

Running unit tests
------------------

Unit tests are located in `test/unit`. To run all unit tests:

```
npm test
```

To run selected unit tests, you can grep any string from `describe` or `it` section
of any test, e.g.:

```
npm test -- -g login
npm test -- --grep login
```

Local build with clean up
-------------------------

```
rm -rf node_modules browser/jspm_modules browser/config.js test/jspm-config.js
npm install
```

Debugging
---------

Enable ChromeDevtools in installer window

```
export PDKI_DEBUG=1
npm run
```

Releasing the installer
-----------------------

TODO
