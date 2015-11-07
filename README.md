# developer-platform-install

Red Hat Developer Platform Installer
====================================
This installer is built on Windows using [Electron 0.33](http://electron.atom.io/).

You will also require the [Node.js, NPM](https://nodejs.org/), [Gulp](http://gulpjs.com/) and [jspm](http://jspm.io/).

After installing Node.js (and NPM), install Gulp and jspm:

```
npm install -g gulp jspm
```

Then, you need to install all dependencies and compile ES6 scripts

```
npm install
jspm install --yes
gulp transpile:app
```

You can run the application using `npm start` or `gulp run`.

Alternatively, you can build a Windows binary and run it

```
gulp generate
dist/DeveloperPlatform-win32-x64/DeveloperPlatform.exe
```

Building on Windows
===================

* Install Node for windows 0.12.x
* Install Python 2.x
* Install MS VS Express 2013 -http://www.microsoft.com/en-gb/download/confirmation.aspx?id=44914
* Install Windows SDK for O/S version
* Run `& "C:\Program Files\Microsoft SDKs\Windows\v7.1\bin\Setenv.cmd" /Release /x64`
* npm install
