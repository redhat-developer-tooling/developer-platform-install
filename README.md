Red Hat Development Suite Installer
====================================

This installer aims to produce ready to use development environment for Red Hat Container Development Kit v2.0.

Deliverables
------------
Build output is two installers. The main difference between them is a file size. One installer is lightweight and download everything during installation. Second one bundles most of binary dependencies and downloads during installation only binaries that cannot be included. Both are self extracting executable files made with 7-zip file archiver with a high compression ratio (7-Zip is licensed under the GNU LGPL license, more details on <https://www.7zip.org>).

Architecture
------------

This installer is built on Windows using [Electron](http://electron.atom.io/).

You will also require the [Node.js, NPM](https://nodejs.org/), [Gulp](http://gulpjs.com/) and [jspm](http://jspm.io/).


Installing dependencies
-----------------------

In order to build the installer, you'll need to install some tools.

1. Download and install Node for Windows from <https://nodejs.org/en/download/>. Pick the MSI installer.

2. Download and install MS Visual Studio Express 2015 from <https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx> (pick the Express for Desktop installer) or Microsoft Visual C++ 2010 SP1 Redistributable Package from <http://www.microsoft.com/en-us/download/details.aspx?id=8328>

3. Download and install Python 2.7.x for Windows from <https://www.python.org/downloads/release/>

4. Edit your "Path" by going to the "System" Control Panel, "Advanced system settings", "Environment Variables". Add _C:\Program Files\nodejs;C:\Users\<username>\App Data\Roaming\npm_ to the "Variable value".

Note that your system might have an "AppData" (no space) instead of "App Data" (with space) folder, so make sure you use the correct path for your system.

5. Install Gulp, JSPM, and all dependencies:

        npm install -g gulp jspm
        npm install

If either of the above steps fail, try deleting the c:\Users\<username>\.electron folder.

Running the application
-----------------------

There are multiple ways how to run the installer.

1. When fixing bugs and/or creating new features, run the application using

        npm start

   This way, you can open Chrome developer tools using `Ctrl+Alt+I` or reload application using `Ctrl+R`.

2. Build a Windows binary and run it:

        npm run generate
        dist/win/DevelopmentSuiteInstaller-win32-x64/DevelopmentSuiteInstaller.exe

3. Build a distribution Windows binary that downloads Vagrant, VirtualBox, devstudio, etc. from the Internet (it will download about 1.6G):

        npm run package-simple
        dist/win/DevelopmentSuiteInstaller-win32-x64-*.exe

4. Build a distribution Windows binary including almost all dependencies, except of Vagrant and VirtualBox (will download them):

        npm run package-bundle
        dist/win/DevelopmentSuiteInstaller-win32-x64-*-bundle.exe

5. To build both installers in a single step:

        npm run dist

Local build with clean up
-------------------------

If your npm install gets corrupted (or out of date) and you can't build, you can try cleaning leftover modules by deleting all dependencies and generated configuration files and installing them again:

    rm -rf node_modules/ browser/jspm_packages/ browser/config.js test/jspm-config.js
    npm cache clean
    npm install -g gulp jspm
    npm install

Then build as in the examples above.

Running unit tests
------------------

Unit tests are located in `test/unit`. To run all unit tests:

    npm test

To run selected unit tests, you can grep any string from `describe` or `it` section
of any test, e.g.:

    npm test -- -g login
    npm test -- --grep login

Debugging
---------

Enable ChromeDevtools in installer window

    export PDKI_DEBUG=1
    npm run

Releasing the installer
-----------------------

TODO
