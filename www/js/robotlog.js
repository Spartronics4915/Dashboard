//
// robotllog.js:
//      is the browser-side communication portal to the robolog server
//      residing within the python/tornado webserver running usually
//      on localhost.  In the server, udp messages are received. These
//      are forwarded to our websocket for consumption by javascript
//      for presentation.
//
//      The structure of this class is based upon networktables2js
//
"use strict";

var RobotLog = new function () {

	if (!("WebSocket" in window)) {
		alert("Your browser does not support websockets, this will fail!");
		return;
	}

	var m_cnxListeners = [];
	var m_logListener = null;
    var m_log = []; // an array of strings
    var m_lastSlice = null;
    var m_repeat = 0;

	/**
		Sets a function to be called when the websocket connects/disconnects

	    :param f: a function that will be called with a single boolean parameter
	              that indicates whether the websocket is connected
	    :param immediateNotify: If true, the function will be immediately called
	                            with the current status of the websocket
    */
	this.addWsConnectionListener = function(f, immediateNotify) {
        if (m_cnxListeners.indexOf(f) != -1) {
    		m_cnxListeners.push(f);
        }
		if (immediateNotify) {
			f(m_socketOpen);
		}
	};

	/**
		Set a function that will be called whenever any log message is received

	    :param f: When any key changes, this function will be called with
                  a single parameter - a a string log message.
	    :param immediateNotify: If true, the function will be immediately called
	                            with the all existing log msgs.
    */
	this.setLogListener = function(f, immediateNotify) {
		m_logListener = f;
		if (immediateNotify) {
            this.replayLogs();
		}
	};

    this.replayLogs = function() {
        if(m_logListener) {
            for(var i=0;i<m_log.length;i++) {
				m_logListener(m_log[i]);
			};
        }
    },

	this.isWsConnected = function() {
		return m_socketOpen;
	};

	//
	// RobotLog socket code
	//

	var m_socket;
	var m_socketOpen = false;
	var m_robotConnected = false;
	var m_robotAddress = null;
    var self = this;

	// construct the websocket URI, presumed to be on the same site that
    // served this page.
	var m_loc = window.location;
	var m_host;

	if (m_loc.protocol === "https:") {
		m_host = "wss:";
	} else {
		m_host = "ws:";
	}

	m_host += "//" + m_loc.host;
	m_host += "/robotlog/ws";

    function msgIsUnique(msg) {
        // check msg against last-most, unique if tail differs (timestamp at head)
        var result = true;
        var newslice = msg.substr(12); // skips first 12 chars
        if(m_lastSlice === newslice)
        {
            // repeated msg
            m_log.pop();
            m_log.push(msg + " (" + m_repeat++ + ")");
            result = false; // not unique
        }
        else
        {
            // unique message
            m_repeat = 1;
            m_lastSlice = newslice;
        }
        return result;
    }

	function createSocket() {
		m_socket = new WebSocket(m_host);
		if (m_socket) {

			m_socket.onopen = function() {
				m_socketOpen = true;
				for (var i in m_cnxListeners) {
					m_cnxListeners[i](true);
				}
			};

			m_socket.onmessage = function(msg) {
                // currently our messages are just simple strings...
				var data = msg.data;
                if(msgIsUnique(data))
                    m_log.push(data);
                else
                    data = null; // null means replay logs
                if(m_logListener) 
                {
                    m_logListener(data);
                }
			};

			m_socket.onclose = function() {
				if (m_socketOpen) {
					for (var i in m_cnxListeners) {
						m_cnxListeners[i](false);
					}
					// clear log, it's no longer valid
                    m_log = [];
					m_socketOpen = false;
					console.log("RobotLog WebSocket closed");
				}

				// respawn the websocket
				setTimeout(createSocket, 300);
			};
		}
	}

	createSocket();
}
