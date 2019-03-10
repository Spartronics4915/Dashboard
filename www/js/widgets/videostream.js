/* global SelectorWidget, Widget, $, app, WebRTCSignaling, CanvasUtils, cv */

// VideoStream presentation of videostream (of various flavors) targeting
//   the multi-stream in one widget case. If you only have a single stream
//   or require multiple widgets, CamerasWidget is likely a better choice.
// VideoStream may be called for if you are having troubles switching 
//    between streams or switching is too time-consuming.  VideoStream 
//    mode addresses this problem by keeping open multiple streams for 
//    the lifetime of the page.  Views are switched by css visibility and 
//    this means that even invisible streams may consume bandwidth + resources.
//    We only open a stream upon first use, so if no streamswitching is
//    requested, we should see the "minimal" bandwidth usage.
//  NB: we still must cleanup on page-changes and this has the potential to
//    produce a variety of timeout, etc issues. So the "least-unstable" solution
//    would be where this widget is displayed in navless mode for the duration
//    of a match.  Networktable changes to the videostream key can be generated
//    by robot or driverstation to select/switch the current stream.
//

class VideoStreamWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        if(!this.config.params) this.config.params = {};
        let html = "";
        this.baseId = this.config.id;
        let index = 0;
        this.streamStates = {}; // dict of streamState (defined below)
        for(let camkey in this.config.params.streams)
        {
            let ss = this.config.params.streams[camkey];
            this.streamStates[camkey] = 
                    new streamState(this.baseId, this.config.params.overlayId, 
                                    index++, camkey, ss, this.pageHandler);
        }
        this.targetElem = targetElem;
        html += "<div id='${this.baseId}' class='container'></div>";
        this.targetElem.html(html);
        app.debug("videostream.js constructed");
    }

    // cleanup is called when switching pages.
    cleanup()
    {
        app.info("cleanup videostreams");
        for(let camkey in this.streamStates)
        {
            this.streamStates[camkey].cleanup();
        }
    }

    // valueChanged fires when the stream-config or stream-switcher changes.
    //  it also fires when overlay values change
    valueChanged(key, value, isNew)
    {
        if(app.ntkeyCompare(this.config.ntkeys[0], key))
        {
            let cleanup = true;    
            for(let camkey in this.streamStates)
            {
                let ss = this.streamStates[camkey];
                if(camkey == value)
                {
                    cleanup = false;
                    ss.activate();
                }
                else
                    ss.deactivate();
            }
            // no camkey matches is the signal that it's time to cleanup
            if(cleanup)
                this.cleanup();
        }
    }

    addRandomPt()
    {
        // no more than once per second
        let now = Date.now();
        if(this.lastRand == undefined)
            this.lastRand = now - 2000;
        if(now - this.lastRand > 1000)
        {
            let keys = Object.keys(this.streamStates);
            let i = Math.floor(Math.random() * keys.length);
            app.putValue(this.config.ntkeys[0], keys[i]);
            this.lastRand = now;
        }
    }
}

class streamState
{
    constructor(targetId, overlayId, index, camkey, ss, ph)
    {
        this.targetId = targetId;
        this.targetElem = document.getElementById(this.targetId);
        this.overlayId = overlayId;
        this.camkey = camkey;
        this.elemId = targetId+index;
        this.elem = null;
        this.msgElemId = this.elemId + "Msg";
        this.handler = null;
        this.active = false;
        this.protocol = ss.protocol;
        this.ip = ss.ip;
        this.url = ss.url;
        this.cls = ss.cls;
        this.activations = 0;
        this.pageHandler = ph;
    }

    activate()
    {
        if(this.elem == null)
        {
            // first time
            let html;
            switch(this.protocol)
            {
            case "http": // mjpegstreaming
                html = `<img id='${this.elemId}' ` +
                            `src='http://${this.ip}${this.url}' ` +
                            `class='${this.cls}'></img>`;
                break;
            case "ws": // webrtc
                html = `<div id='${this.elemId}Div'>` +
                        `<video muted id='${this.elemId}' ` +
                           `class='${this.cls}'>video unsupported</video>`+
                        "<div id='${this.msgElemId}'></div>" +
                        "</div>";
                break;
            case "testpattern":
                html = `<img id='${this.elemId}' class='${this.cls}'/>`;
                break;
            case "img":
                html = `<img id='${this.elemId}' src='${this.url}' class='${this.cls}'/>`;
                break;
            }
            // NB: we don't want to stomp on targetId's content, so append
            $(this.targetElem).append(html);
            this.elem = document.getElementById(this.elemId);
            this.elem.style.position = "absolute";
            this.elem.style.left = this.targetElem.offsetLeft + "px";
            this.elem.style.top = this.targetElem.offsetTop + "px";
            if(this.elem.nodeName == "IMG")
            {
                this.elem.addEventListener("load", this._onImageLoad.bind(this));
            }
            else
            {
                let url = `ws:${this.ip}${this.url}`;
                this.handler = new WebRTCSignaling(url,
                                        this.vformat,
                                        this._onStreamOpen.bind(this),
                                        this._onStreamError.bind(this),
                                        this._onStreamClose.bind(this),
                                        this._onStreamMsg.bind(this)
                                        );
            }
            app.info("creating " + this.camkey);
        }
        if(this.protocol == "testpattern")
            this.elem.src = this._getRandomImg();
        this.activations++;
        app.info(`activating ${this.camkey} ${this.elemId}`);
        this.elem.style.visibility = "visible";
    }

    deactivate()
    {
        if(this.elem != null)
        {
            app.info(`deactivating ${this.camkey} ${this.elemId}`);
            this.elem.style.visibility = "hidden";
            if(this.elem.nodename == "IMG")
                this.cleanup(); // no advantage to keeping img/mjpg stream open
        }
    }

    cleanup()
    {
        if(this.elem != null)
        {
            app.info("cleaning " + this.camkey);
            if(this.elem.nodeName == "IMG")
            {
                this.elem.src = "";
                this.elem.parentNode.removeChild(this.elem);
            }
            else
            {
                if(this.handler)
                {
                    if(this.active)
                        this.handler.hangup(); // takes a while
                    this.handler = null;
                }
            }
            this.elem = null;
            this.active = false;
        }
    }

    _onImageLoad()
    {
        app.debug("cameras._onLoad " + this.camkey);
        this.active = true;
        this._updateOverlaySize();
    }

    // _onCanPlay only called when we're in video-feed mode
    _onCanPlay()
    {
        app.debug("videostream._onCanPlay " + this.camkey);
        this.active = true;
        this._updateOverlaySize();
    }

    _updateOverlaySize()
    {
        if(this.overlayId != null)
        {
            let oid = this.overlayId;
            let w = this.pageHandler.getWidgetById(oid);
            if(w)
                w.placeOver(this.elem);
            else
                app.warning("can't find overlay widget: " + oid);
        }
    }

    _onStreamOpen(stream)
    {
        app.notice("video stream opened for " + this.camkey);
        this.elem.srcObject = stream;

        // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
        let playPromise = this.elem.play();
        if(playPromise != undefined)
        {
            playPromise.then(function() {
                this._onCanPlay();
            }.bind(this))
            .catch(function(error)
            {
                app.warning("autoplay prevented: " + error);
                // Auto-play was prevented
                // Show paused UI.
            });
        }
        else
        {
            this.elem.addEventListener("canplay", this._onCanPlay.bind(this));
        }
    }

    _onStreamClose()
    {
        app.notice("camera stream closed: " + this.camkey);
        if(this.elem)
            this.elem.srcObject = null;
        this.elem = null;
        this.active = false;
        this.handler = null;
    }

    _onStreamError(msg)
    {
        app.error("camera stream error: " + msg + " for: " + this.camkey);
        let vmsg = document.getElementById(this.msgElemId);
        if(vmsg)
            vmsg.innerHTML = `<span class="WARNING">${msg}</span>`;
        if(this.handler)
        {
            this.handler.hangup(); // XXX: is this wise?
            this.handler = null;
        }
        this.elem.srcObject = null;
    }

    _onStreamMsg(msg)
    {
        app.warning("stream message:" + msg + " for:" + this.camkey);
        let vmsg = document.getElementById(this.msgElemId);
        if(vmsg)
            vmsg.innerHTML = `<span class="WARNING">${msg}</span>`;
    }

    _getRandomImg()
    {
        const testimgs = [
            "/images/standby.jpg",
            "/images/pleasestandby.jpg",
            "/images/nosignal.jpg",
            "/images/offair.jpg",
            "/images/colortest.jpg",
            "/images/testbeeld1956.jpg",
            "/images/underattack.jpg"
        ];
        let i = Math.floor(Math.random() * testimgs.length);
        return testimgs[i];
    }
}

Widget.AddWidgetClass("videostream", VideoStreamWidget);
