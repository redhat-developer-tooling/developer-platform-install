# developer-platform-install

Red Hat Developer Platform Installer
====================================
This installer is built on Windows using [Inno Setup 5.5.6](http://www.jrsoftware.org/isinfo.php), which can be downloaded from [this page](http://www.jrsoftware.org/isdl.php).

After installing Inno Setup, launch the Inno Setup Compiler and open developer_platform_installer.iss.

Ctrl+F9 will compile the installer, while F9 will compile and run the installer.

Building on Linux
-----------------

```
make
```

The resulting installer will be in the `dist` directory.
