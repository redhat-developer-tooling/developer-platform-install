# developer-platform-install

Red Hat Developer Platform Installer
====================================

Architecture
------------

This installer is built on Windows using [Electron 0.33](http://electron.atom.io/).

You will also require the [Node.js, NPM](https://nodejs.org/), [Gulp](http://gulpjs.com/) and [jspm](http://jspm.io/).

Building the installer
----------------------

In order to build the installer, you'll need to install some tools.

1. Download and install Node for Windows from <https://nodejs.org/en/download/>. Pick the MSI installer.
2. Download and install MS Visual Studio Express 2015 from <https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx>. Pick the Express for Desktop installer.
3. Download and install Python 2.7.x for Windows from <https://www.python.org/downloads/release/>
4. Edit your "Path" by going to the "System" Control Panel, "Advanced system settings", "Environment Variables". Add _C:\Program Files\nodejs;C:\Users\<username>\App Data\Roaming\npm_ to the "Variable value"
5. Install Gulp and jspm:
    ```
    npm install -g gulp jspm
   ```

6. Install all dependencies and compile ES6 scripts
    ```
    npm install
    gulp transpile:app
   ```

7. Run the application using `npm start` or `gulp run`.
8. Build a Windows binary and run it:
    ```
   gulp generate
   dist/DeveloperPlatform-win32-x64/DeveloperPlatform.exe
    ```

Releasing the installer
-----------------------

TODO
