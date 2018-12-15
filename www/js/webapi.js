/* global app */
// webapi.js:
//  is the browser-side communication portal to the webapi server
//  residing within the python/tornado webserver running usually
//  on localhost.  In the server, messages are received from arbitrary
//	clients via posts.	The post contents are forwarded to our (single) 
//  websocket for consumption by javascript for presentation. Posts are 
//  categorized by api family. javascript consumers can register interest in a
//	an api family and will be notified as messages arrive.
//
class WebAPISubscriber
{
	constructor()
	{
		if (!("WebSocket" in window))
		{
			alert("Your browser does not support websockets, this will fail!");
			return;
		}
	
		this.m_cnxListeners = []; // notification of websocket connect/disconnect
		this.m_subscribers = []; // 
		this.m_socket;
		this.m_socketOpen = false;

		// construct the websocket URI, presumed to be on the same site that
		// served this page.
		this.m_loc = window.location;
		if (this.m_loc.protocol === "https:")
			this.m_host = "wss:";
		else
			this.m_host = "ws:";
		this.m_host += "//" + this.m_loc.host;
		this.m_host += "/webapi/_subscribe_";

		this._createSocket();
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
	addSubscriber(f)
	{
		if (this.m_subscribers.indexOf(f) == -1)
			this.m_subscribers.push(f);
	}

	isWsConnected () 
	{
		return this.m_socketOpen;
	}

	_createSocket()
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
				// currently our messages are assumed to take the form:
				var data = msg.data;
				var jobj;
				try
				{
					jobj = JSON.parse(data);
				}
				catch(e)
				{
					app.error(e);
				}
				if(jobj)
				{
					var cls = jobj.class;
					let subs = this.m_subscribers;
					if(subs.length > 0)
					{
						for(let lfunc of subs)
							lfunc(cls, jobj);
					}
					else
					{
						app.debug(`no listeners for webapi ${cls}`);
					}
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
					app.notice("WebAPI WebSocket closed");
				}

				// respawn the websocket
				setTimeout(this._createSocket.bind(this), 300);
			}.bind(this);
		}
	}
}

window.WebAPISubscriber = WebAPISubscriber;
