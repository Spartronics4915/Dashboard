# Dashboard

Repository with the Spartronics dashboard code. This dashboard is built 
atop the python implementation of networktables.  Coupled with standard python
webserver tech (here, tornado), the result is a webserver running
on the driver's station that can read and control networktable values.
Now, we can connect a standard web browser to the server and develop 
a custom dashboard built atop standard web technologies: html, css, javascript.

If you:

  * wonder why SendableChooser is so weird/flaky
  * were disappointed by the antiquated collection of interface
    elements available in SmartDashboard
  * were unwilling to invest precious time learning VFX/java GUI plugins

this approach may be for you.

To run the dashboard:

  1. make sure you have python installed (tested with both 3.6 and 2.7)
  2. make sure the correct python moduleis are installed (pynetworktables)
  3. make sure the javascript side of pynetworktable2js is up to date 
    (below www/js).
  3. start dashboard server: python DashboardServer.py
  4. point your favorite web browser to http://localhost:5080, Firefox 
     is recommended over Chrome due to improved performance of mjpg streaming.

### Windows driver station

Drop **a shortcut to** `start.bat` in the startup folder: `Win+R`, 
enter `shell:startup`.  Put a shortcut to Firefox there as well, and 
a shortcut to the driver station.  The driver station shortcut has to 
be marked "Run as Administrator" in its Properties window.  Also, 
disable UAC (the window-dimming 'are you sure' thing) otherwise the 
dashboard won't start up on boot.

### Administration
We've found that Chrome is flaky when it comes to mjpg streams.  We 
therefore highly recommend that you use Firefox as your primary web 
brower for this application.

Because so much code is reused across years, we chose to maintain a 
single repository for multiple years. We will tag the commit at the 
end of a year, to allow us to easily return to that point in history, 
then remove/rework the dashboard for the new game.

Upgrading pynetworktables requires simultaneous update of pynetworktables2s.
Pip installs may or may not be in sync and may very according to python version.
As of 1/20/2018, the python3 version of pynetworktables is still at 2017 level.
For this reason python27 is preferred.

Dashboard access to robot logs may be impeded by firewall rules on your 
computer.  Inbound UDP traffic is required.

### Programming Note

From the pynetworktables2js docs:

  NetworkTables is type sensitive, whereas Javascript is loosely typed.
  This function will not check the type of the value that you are trying
  to *put*, so you must be careful to only put the correct values (types) 
  that are expected. If your robot tries to retrieve the value and it is an
  unexpected type, an exception will be thrown and your robot may crash.
  Make sure you test your code – you have been warned.

### Helpful Links

[python](http://python.org) - is the language atop-which the dashboard
support resides.  

[pynetworktables](https://github.com/robotpy/pynetworktables) - is
the core technology.  You can use standard 'pip' mechanism to install
this module into your python interpreter:  'python -m pip install pynetworktables'

[pynetworktables2js](http://pynetworktables2js.readthedocs.io/en/stable/) -
is a small python module that forwards NetworkTables key/values over a Websocket,
so that you can easily write a Driver Station Dashboard for your robot in
HTML5 + JavaScript.  Included in the package are JavaScript utilities to
connect with the websocket.  Install via: 'python -m pip install pynetworktables2js'

### Acknowledgements

Thanks to the robotpy maintainers for pynetworktables!
