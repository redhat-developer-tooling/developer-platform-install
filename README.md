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
gulp package
dist/DeveloperPlatform-win32-x64/DeveloperPlatform.exe
```
