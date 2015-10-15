# developer-platform-install

Red Hat Developer Platform Installer
====================================
This installer is built on Windows using [Inno Setup 5.5.6](http://www.jrsoftware.org/isinfo.php), which can be downloaded from [this page](http://www.jrsoftware.org/isdl.php).

You will also require the [Inno Download Plugin](https://code.google.com/p/inno-download-plugin/).

After installing both Inno Setup and the Inno Download Plugin, launch the Inno Setup Compiler and open developer_platform_installer.iss.

Ctrl+F9 will compile the installer, while F9 will compile and run the installer.

Building on Linux
-----------------

```
make
```

The resulting installer will be in the `dist` directory.
