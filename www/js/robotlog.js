/* global app */
// robotlog.js:
//      is the browser-side communication portal to the robolog server
//      residing within the python/tornado webserver running usually
//      on localhost.  In the server, messages (was udp, now tcp) are received. 
//		These are forwarded to our websocket for consumption by javascript
//      for presentation.
//
//      The structure of this class is based upon networktables2js
//
const kMaxLogLength = 2000;
const kLogPrune = 100;
class RobotLog
{
    constructor()
    {
        if (!("WebSocket" in window))
        {
            alert("Your browser does not support websockets, this will fail!");
            return;
        }
        this.m_cnxListeners = [];
        this.m_logListener = null;
        this.m_log = []; // an array of strings
        this.m_lastSlice = null;
        this.m_repeat = 0;

        // RobotLog socket code ------
        this.m_socket;
        this.m_socketOpen = false;
        this.m_robotConnected = false;
        this.m_robotAddress = null;

        // construct the websocket URI, presumed to be on the same site that
        // served this page.
        this.m_loc = window.location;
        if (this.m_loc.protocol === "https:")
            this.m_host = "wss:";
        else
            this.m_host = "ws:";
        this.m_host += "//" + this.m_loc.host;
        this.m_host += "/robotlog/ws";

        this.createSocket();
    }

    /**
        Sets a function to be called when the websocket connects/disconnects

        :param f: a function that will be called with a single boolean parameter
                  that indicates whether the websocket is connected
        :param immediateNotify: If true, the function will be immediately called
                                with the current status of the websocket
    */
    addWsConnectionListener(f, immediateNotify) 
    {
        if (this.m_cnxListeners.indexOf(f) != -1)
            this.m_cnxListeners.push(f);
        if (immediateNotify)
            f(this.m_socketOpen);
    }

    /**
        Set a function that will be called whenever any log message is received

        :param f: When any key changes, this function will be called with
                  a single parameter - a a string log message.
        :param immediateNotify: If true, the function will be immediately called
                                with the all existing log msgs.
    */
    setLogListener(f, immediateNotify)
    {
        this.m_logListener = f;
        if (immediateNotify)
            this.replayLogs();
    }

    replayLogs() 
    {
        if(this.m_logListener) 
        {
            for(var i=0;i<this.m_log.length;i++)
                this.m_logListener(this.m_log[i]);
        }
    }

    isWsConnected () 
    {
        return this.m_socketOpen;
    }

    msgIsUnique(msg)
    {
        if(msg.trim().length == 0) return false;

        // check msg against last-most, unique if tail differs (timestamp at head)
        var result = true;
        var newslice = msg.substr(12); // skips first 12 chars
        if(this.m_lastSlice === newslice)
        {
            // repeated msg
            this.m_log.pop();
            this.m_log.push(msg + " (" + this.m_repeat++ + ")");
            result = false; // not unique
        }
        else
        {
            // unique message
            this.m_repeat = 1;
            this.m_lastSlice = newslice;
        }
        return result;
    }

    createSocket()
    {
        this.m_socket = new WebSocket(this.m_host);
        if (this.m_socket) 
        {
            this.m_socket.onopen = function() 
            {
                this.m_socketOpen = true;
                for (var i in this.m_cnxListeners) {
                    this.m_cnxListeners[i](true);
                }
            }.bind(this);

            this.m_socket.onmessage = function(msg) 
            {
                // currently our messages are just simple strings...
                var data = msg.data;
                if(this.msgIsUnique(data))
                {
                    this.m_log.push(data);
                    if(this.m_log.length > kMaxLogLength)
                    {
                        this.m_log = this.m_log.slice(kLogPrune);
                        this.m_log.unshift("--- snip  ---");
                    }
                }
                else
                    data = null; // null means replay logs
                if(this.m_logListener) 
                {
                    this.m_logListener(data);
                }
            }.bind(this);

            this.m_socket.onclose = function() 
            {
                if (this.m_socketOpen) 
                {
                    for (var i in this.m_cnxListeners)
                        this.m_cnxListeners[i](false);

                    // clear log, it's no longer valid
                    this.m_log = [];
                    this.m_socketOpen = false;
                    app.notice("RobotLog WebSocket closed");
                }

                // respawn the websocket
                setTimeout(this.createSocket.bind(this), 300);
            }.bind(this);
        }
    }
}

window.RobotLog = RobotLog;
