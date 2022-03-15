<!-- TOC depthFrom:2 orderedList:false -->
- [Introduction](#introduction)
- [Install OS](#install-os)
- [Post Install](#post-install)
- [General Software](#general-software)
- [Git for Windows](#git-for-windows)
- [FRC Software](#frc-software)
- [Spartronics Dashboard](#spartronics-dashboard)
- [Set up Driver camera and display scripts](#set-up-driver-camera-and-display-scripts)
- [Install PuTTY keys (the easy way)](#install-putty-keys-the-easy-way)
- [Install GStreamer](#install-gstreamer)

<!-- /TOC -->

## Introduction

Document the steps to configure a driver station from the basic Windows install.

## Install OS

 * Currently Windows 10.  Installing on a Thinkpad T470.
 * Region: United States
 * Keyboard: US (no second layout)
 * Set up for personal use
 * Select 'Offline account' on the 'Add your account' page
 * Select 'Limited experience' on the 'Sign in ...' prompt page
 * Set 'spartronics' as user, with an easy password.  Not good security as a general rule, but then again, we're not going to be on the network.
 * Set the three security questions.  The answers will be put into a KeePass file once the install is done.
 * Skip fingerprint setup
 * Turn off all of the options on the 'Choose privacy' page
 * Skip setting up entertainment options
 * Don't set up Cortana

## Post Install

 * Main screen setups:
   * Set main screen right-click 'View' to 'Small icons'
   * Under main screen right-click 'Personalize', select 'Themes' then 'Desktop icon settings'.  Click at least the box for 'Computer' to display 'This PC' icon.  Also in 'Personalize', change the background to 'Solid color' (used default of black)
   * Still on 'Personalize' select 'Lock screen' and 'Screen timeout settings'.  Set times to reasonable values.
 * Task bar setups:
   * On task bar right-click menu, turn off Cortana and Task View buttons, select 'News and Interests' and turn off.  On right-click menu, select 'Settings' and turn on 'Small taskbar buttons'.
 * Right click on 'This PC' and select 'Properties'.  Click on 'Rename this PC'.  Named it 'DriverStation2'.  Reboot.
 * Right click on 'This PC' and select 'Properties'.  Click on 'Change product key ...'.  On next screen, select 'Change product key', and enter the product key.  Activate the key once requested.
 * Create a 'Robotics' (C:\Robotics) folder at the top level.  This should be where all files are stored.
 * Set a 'HOME' variable to point to this directory
   * Right click on the 'This PC' icon on the desktop and select 'Properties'.
   * In the resulting dialog, select 'Advance system settings'
   * Select 'Environment Variables' in the next dialog
   * In the 'User variables' section, select 'New'.
   * Set the variable name to 'HOME' (all upper case).  Set the variable value to 'c:\Robotics'
   * Click 'OK'
   * Click 'OK' at the main 'Environment Variables' dialog
   * Click 'OK' at the 'System Properties' dialog
   * Close the 'Settings' dialog
 * Turn on display of extensions and hidden files
  * In the File Explorer, click 'View', and in the displayed ribbon, check the 'File name extensions' and the 'Hidden items' boxes


## General Software

 * Install Chrome (ignoring all the Microsoft Edge prompts) [https://www.google.com/chrome Download chrome]
   * Skip the bookmarks, background, and 'Chrome, Everywhere' pages.  Set Chrome as the default browser.
 * Install Firefox [https://www.mozilla.org/en-US/firefox/windows/ Download Firefox]
 * Install KeePass [https://keepass.info/download.html KeePass]
 * Install PuTTY get latest 64-bit (currently 0.76) at [https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html PuTTY]. Example: [https://the.earth.li/~sgtatham/putty/latest/w64/putty-64bit-0.76-installer.msi Installer]

## Git for Windows

 * Install Git for Windows [https://github.com/git-for-windows/git/releases/download/v2.35.1.windows.2/Git-2.35.1.2-64-bit.exe Git install]
   * Check 'Additional icons' in the Select Components prompt.
   * Take defaults until 'Adjusting the name ...' dialog.  Click the 'Override ...' radio button and leave the setting as 'main'.
   * Continue to take defaults until the 'Configuring extra options' dialog.  Check the 'Enable symbolic links' box.
   * Don't take any experimental options
   * Click 'Install'
 * Open a Git Bash shell and create a Bash shell startup script.  Using 'vi .bashrc':
   * Enter 'a' to go into insert mode
   * Add the following:
```bash
# Source global definitions
if [ -f /etc/bash.bashrc ]; then
    . /etc/bash.bashrc
fi

if [ ! -z  "$PS1" ]; then
    export PS1=' \[\e[0;36m\]\h [\@]: \! $ \[\e[m\]'

    # Inhibit ^D logout
    export IGNOREEOF=3

    # User specific aliases and functions
    alias ll='ls -laF --color=auto'
    alias ls='ls -aF --color=auto'
    alias more='less'
    alias lo='logout'
fi
```
   * Enter 'Esc' to get out of insert mode
   * Enter ':wq' to write the file and quit
 * Using 'vi .bash_logout, create a logout file:
   * Enter 'a' to go into insert mode
   * Add the following:
```bash
# ~/.bash_logout: executed by bash(1) when login shell exits.

# when leaving the console clear the screen to increase privacy

if [ "$SHLVL" = 1 ]; then
    [ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q
fi
```
   * Enter 'Esc' to get out of insert mode
   * Enter ':wq' to write the file and quit

## FRC Software

From the FRC instructions at [https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-2/index.html Installing software].

 * Install FRC Game Tools [https://www.ni.com/en-us/support/downloads/drivers/download.frc-game-tools.html#440024 Game Tools].  Best to grab the offline installer (currently 2022 f1).
   * Offline installer as of this writing (03.11.22) is ni-frc-2022-game-gools_22.0.1_offline.iso.
   * Once downloaded, double click on install file, which will open the .iso into an install directory
   * Double click in the 'Install' file.
   * Accept all the license agreements.
   * Don't need the NI Vision Support or the RT System Image in the 'Additional items ...' page, but do include the Certificate Installer, if displayed
   * Cancel out of the 'Activate Software' screen.
   * Reboot when prompted.
 * Install Java (needed for the Radio Config tool) (currently version 17): [https://download.oracle.com/java/17/latest/jdk-17_windows-x64_bin.msi Java SDK]
   * Ignore 'Next Steps'.
 * Install the FRC Radio Configuration Tool [https://firstfrc.blob.core.windows.net/frc2022/Radio/FRC_Radio_Configuration_22_0_1.zip Radio Config Tool].  It is a .zip file which Windows can open, but it will complain when you run the .exe inside.  Click on 'More info' in the dialog and then 'Run anyway'.  You will need to also install Npcap as part of the install (it's included) - as noted take all of the defaulted options.
 * Though we won't be deploying code from this laptop, there are facilities in WPILib that we could potentially use (SmartDashboard, Shuffleboard), so install the latest WPILib from the Github site: [https://github.com/wpilibsuite/allwpilib/releases/download/v2022.4.1/WPILib_Windows64-2022.4.1.iso WPILib].  Click on the .iso and open it.  Run the WPILibInstaller.exe.  Select 'Tools Only' and 'Install for all Users'.

 Note: For both the FRC Radio Configuration and Driver Station, you will need to set the team number (4915) as part of the first execution.


## Spartronics Dashboard

 * Install Python.  The Dashboard uses pynetworktables and pynetworktables2js, both of which have problems with Python>3.8.x.  So we'll install the latest 3.8 binary release - 3.8.10 [https://www.python.org/ftp/python/3.8.10/python-3.8.10-amd64.exe Python 3.8.10].  Run the installer, and select 'Customize installation'.
   * Make sure that all the optional features (including 'for all users') are checked.
   * On the next screen, check 'Install for all users' and 'Add to PATH environment variable'.  Notice that the install path changes to C:\Program Files\Python38.
   * Click Install
   * When the prompt for 'Disable path length limit' appears, click on it to allow longer paths.
 * Check that Python exists in the execution path by searching for 'cmd' and typing 'py -3' in the command window.  Python should start and display a '>>>' prompt.  To get out, type 'ctrl-Z' then 'Enter'.
 * Open a Git Bash shell and clone the Spartronics Dashboard repository into the spartronics directory:
```bash
cd /c/Users/spartronics
git clone https://github.com/Spartronics4915/Dashboard.git
```
  * In a Windows command shell (as Administrator), change into the Dashboard directory and use the requirements.txt file there to install some Python requirements:
```bash
cd c:\Users\spartronics\Dashboard
py -3 -m pip install -r requirements.txt
```
## Set up Driver camera and display scripts

 * In a Git Bash shell, clone the Spartronics Vision repository into the home directory
 ```bash
 cd ~
 git clone https://github.com/Spartronics4915/Vision.git
 ```
 * Open a Git Bash window and change to the tools/DriverCamScripts/Windows directory in the Vision repository:
 ```bash
cd ~/Vision/tools/DriverCamScripts/Windows
cp -r .ssh * /c/Users/spartronics
```
 * In a Windows command shell (as Administrator), run the Spartronics.reg file:
 ```bash
 cd %HOME%
 Spartronics.reg
 ```
 Select 'Yes' at the prompt.

 * In the Windows File Explorer, navigate to c:\Users\Spartronics, copy and expand the zip with the desktop shortcuts:
  * Right click on the Startup.zip
  * Select the 'Extract all' option
  * Replace 'Startup' in the displayed path with 'Desktop'
  * The folder 'Startup' and other shortcuts should appear on the Desktop

 * Create a 'Startup' toolbar
  * Right click in an open area on the task bar
  * Under Toolbars, select 'New toolbar'
  * Navigate to 'This PC\Desktop'
  * Single click on Startup to select it
  * Click 'Select Folder'
  * A new 'Startup' toolbar should appear in the taskbar

## Install PuTTY keys (the easy way)

SSH will be used to communicate between the Driver Station and the Raspberry Pis. In order for 
the communication to work seamlessly, SSH key files need to be generated, and the PuTTY SSH agent,
Pageant, needs to be set up.  The private key files used are not pass-phrase protected, so they can't be
stored in the repository.  
 * There should be a USB stick in the Vision box that contains a copy of
the .ssh directory for the Driver Station.  If so, copy the contents into c:\Users\spartronics (choose to replace any existing files).
 * Set PuTTY's Pageant agent to start up on login.  The shortcut that was copied to the Desktop in the previous section already is set up to install the Spartronics key into the agent - it just needs to be copied into the Windows Startup folder.
  * Type 'Windows-R' to open the 'Run' dialog
  * Typs 'shell:startup' in the dialog box. This will open up an Explorer window into the Startup folder.
  * Copy the 'Pageant' shortcut from the desktop into this folder and close it.

## Install GStreamer

This is a library that allows video streaming.  As of this writing (03.09.22), the compatible version between Windows and the Raspberry Pi is 1.4.4.  The downloads for Windows can be found at [https://gstreamer.freedesktop.org/data/pkg/windows/1.4.4/ GStreamer downloads].

 * Download the following two files:
   * [GStreamer package](https://gstreamer.freedesktop.org/data/pkg/windows/1.4.4/gstreamer-1.0-x86_64-1.4.4.msi)
   * [GStreamer dev package](https://gstreamer.freedesktop.org/data/pkg/windows/1.4.4/gstreamer-1.0-devel-x86_64-1.4.4.msi)

 Install both packages, selecting the 'Complete' install in both cases.







