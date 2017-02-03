# Spartronics 2017-Dashboard

Repository with the Spartronics code for the Dashboard for
FRC 2017-STEAMWorks game. This dashboard is built atop the python
implementation of networktables.  Coupled with standard python
webserver tech (here, tornado), the result is a webserver running
on the driver's station that can read and control networktable values.
Now, we can connect a standard web browser to the server
and develop a custom dashboard build atop standard web technologies.

If you:
  * wonder why SendableChooser is so weird/flaky
  * were disappointed by the antiquated collection of interface
    elements available in SmartDashboard
  * were unwilling to invest precious time learning VFX/java GUI plugins

this approach may be for you.

To run the dashboard:

  1. make sure you have python installed (2.7+ may be the best choice)
  2. make sure the correct python modules are installed (pynetworktables, pynetworktable2js)
  2. start dashboard server:  python DashboardServer.py
  3. point your favorite web browser to http://localhost:5080

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

[bootstrap](http://getbootstrap.com) - is a common / basic collection of
widgets and styling templates for website development.

### Acknowledgements

Thanks to the robotpy maintainers for pynetworktables!
