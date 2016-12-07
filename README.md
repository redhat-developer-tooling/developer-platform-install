Red Hat Development Suite Installer
====================================

This installer aims to produce ready to use development environment for [Red Hat Container Development Kit](http://developers.redhat.com/products/cdk/overview/) on Windows and macOS platforms.

Deliverables
------------
Build output is two platform specific executables: Online and Bundle installer. Online Installer is lightweight (aproximately 50Mb) and it downloads everything during installation. Bundle Installer includes most of binary dependencies and downloads binaries that cannot be included during installation.

#### Windows

Both Installers are self extracting executable files made with 7-zip file archiver with a high compression ratio (7-Zip is licensed under the GNU LGPL license, more details on <https://www.7zip.org>).

#### macOS

Both Installers are zipped macOS Application Bundles.

Architecture
------------

This installer is desktop application for Windows and macOS built with [Electron](http://electron.atom.io/docs/tutorial/about/).

Building Installer
------------------

To build installer follow steps below for specific platform.

#### Windows

1. Download and install Node for Windows from <https://nodejs.org/en/download/>. Pick the MSI installer.

2. Download and install MS Visual Studio Express 2015 from <https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx> (pick the Express for Desktop installer) or Microsoft Visual C++ 2010 SP1 Redistributable Package from <http://www.microsoft.com/en-us/download/details.aspx?id=8328>

3. Download and install Python 2.7.x for Windows from <https://www.python.org/downloads/release/>

4. Edit your "Path" by going to the "System" Control Panel, "Advanced system settings", "Environment Variables". Add _C:\Program Files\nodejs;C:\Users\\&lt;username&gt;\App Data\Roaming\npm_ to the "Variable value".

   Note that your system might have an "AppData" (no space) instead of "App Data" (with space) folder, so make sure you use    the correct path for your system.

5. Download and install git for windows from <https://github.com/git-for-windows/git/releases/tag/v2.11.0.windows.1>

6. Run gitbash from Windows Start Menu

7. In gitbash windows clone installer repository by running

        git clone https://github.com/redhat-developer-tooling/developer-platform-install.git ~/Projects/developer-platform-install

8. Then change current directory to repository root

        cd ~/Projects/developer-platform-install

9. Install required dependencies with

        npm install

10. Build installer executables with

        npm run dist

After build is finished ./dist folder should contain Windows executable files for On-line and Bundle Installers.

#### macOS

1. Install git by running

        git

   from bash terminal and then follow the requests to install Xcode Development IDE

2. Run git again to accept the license

3. Install nvm (Nodejs Version Management) by running following shell script in bash terminal

        touch ~/.bash_profile
        curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash

   then restart bash to pick up changes in your environment

4. Install nodejs using nvm command

        nvm install 3.6.1

5. Clone installer repository

        git clone https://github.com/redhat-developer-tooling/developer-platform-install.git ~/Projects/developer-platform-install

6. Then change current directory to repository root

        cd ~/Projects/developer-platform-install

7. Install required dependencies with

        npm install

8. Build installer executables with

        npm run dist:mac

After build is finished ./dist folder should contain zipped macOS application package files for On-line and Bundle Installers.

#### Linux

1. Install git by running

        sudo yum install git

  from terminal

2. Install nvm (Nodejs Version Management) by running following shell script in terminal

        touch ~/.bash_profile
        curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash

  then restart bash to pick up changes in your environment

3. Install nodejs using nvm command

        nvm install 6.9.1

4. Clone installer repository

        git clone https://github.com/redhat-developer-tooling/developer-platform-install.git ~/Projects/developer-platform-install

5. Then change current directory to repository root

        cd ~/Projects/developer-platform-install

6. Install required dependencies with

        npm install

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

    rm -rf node_modules/
    npm cache clean
    npm install -g gulp
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

Unit tests code govergare is calculated by Istanbul. By default it generates html and raw coverage reports. Report format can be overriden with '--report' parameter like shown below

    npm test -- --report cobertura

Running Angular protractor UI tests
---------------------------

UI tests are located in 'test/ui'. To run all UI tests:

    npm run ui-test

Running System (e2e) tests
--------------------------

System tests are located in the 'test/system' folder. These tests have requirements depending on the platform they are run on.

#### Windows
In order to run the tests successfully on Windows, you need to have 'Oracle Corporation' added to the list of trusted publishers (otherwise a modal dialog will interrupt the tests when installing VirtualBox). The tests need to be run by a user with administrative privileges.

When running the tests locally, use the following command:

    npm run system-test -- --binary="path to a devsuite installer executable archive"

For CI environment a powershell script is available in 'test/system/windows/runTests.ps1':

    powershell -file $devsuiteFolder/test/system/windows/runTests.ps1 -binary "path to sfx archive"

This script is designed to launch the tests with elevated privileges and copy the installation logs into the $devsuiteFolder for archivation in CI environment.

Debugging
---------

Enable ChromeDevtools in installer window

    export PDKI_DEBUG=1
    npm start

or you can run installer with

    npm start

and then push Ctrl + Shift + I to show ChromDevTools in current installer window

Testing online installer
------------------------

#### With mock server for all downloaded resourses

In windows System Properties Setting Dialog add

    DSI_REJECT_UNAUTHORIZED=false

to your user environment variables.
Run notepad.exe as Administrator and add

    127.0.0.1 developers.redhat.com

to C:\Windows\system32\Drivers\etec\hosts file.

Then download (VPN is Required) all requirements with

    gulp prefetch-all

When download is finished run http and https mock servers to mimic
developers.redhat.com with download-manager links. In separate windows run

    node gulp-tasks/http-server.js

and then

    node gulp-tasks/https-server.js

Now you are ready to test online installer. Start
dist/win/DevelopmentSuiteInstaller-win32-x64-*.exe from package explorer. Mock
http server always returns let you pass account information page, but if you
plan to install and test CDK in DevStudio use your real Red Hat user name from
developers.rdhat.com.

#### With mock server for download-manager resources only

In Windows System Properties Setting Dialog add

    DSI_REJECT_UNAUTHORIZED=false
    DM_STAGE_HOST=localhost

to your user environment variables.

Then download (VPN is Required) requirements with

    gulp prefetch

When download is finished run https mock servers to mimic
developers.redhat.com with download-manager links. In separate windows execute

    node gulp-tasks/https-server.js

Now you are ready to test online installer without actual bits published to
download-manager. Start dist/win/DevelopmentSuiteInstaller-win32-x64-*.exe
from package explorer and use it as you would normally do after release.


Releasing the installer
-----------------------

TODO
