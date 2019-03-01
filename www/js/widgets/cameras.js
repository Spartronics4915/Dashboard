/* global SelectorWidget, Widget, $, app, WebRTCSignaling, CanvasUtils, cv */

// legacy cams here for reference, now expressed in per-season layout files.
// var piCam = {ip:"10.49.15.10:5080", url: "/cam.mjpg", cls:"rotate0"};
// var dlink13 = {ip:"admin:@10.49.15.13", url: "/video.cgi", cls:"rotate90"};
// var dlink14 = {ip:"admin:@10.49.15.14", url: "/video.cgi", cls:"rotate0"};
// var axis1 = {ip:"10.49.15.11", url: "/mjpg/video.mjpg", cls:"rotate0"};
// var axis2 = {ip:"10.49.15.12", url: "/mjpg/video.mjpg", cls:"rotate0"};
// var usbCam = {ip:"10.49.15.2:1180", url: "/?action=stream", cls:"rotate0"};

// the CamerasWidget can present a selector or not depending upon the
//   boolean config.params.selector
class CamerasWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        if(!this.config.params) this.config.params = {};
        let html = "";
        this.baseId = this.config.id;
        this.selWidgetId = `${this.baseId}Sel`; // container for select widget
        this.selSelectId = this.config.ntkeys[0]; // ie: /SmartDashboard/CameraView
        this.divId = `${this.baseId}Div`;
        this.imgId = `${this.baseId}Img`;
        this.vidId = `${this.baseId}Vid`;
        this.vidEl = null;
        this.imgEl = null;
        this.streamHandler = null;
        this.isStreaming = false;
        this.targetElem = targetElem;

        html += "<div class='container'>";

        if(this.config.params.selector)
        {
            html += "<div class='containerrow xtrapad'>";
            html +=    `<span class='title'>${this.config.label}</span>`;
            html +=    `<div id='${this.selWidgetId}'></div>`;
            html += "</div>";
        }

        html +=  `<div id='${this.divId}' class='cameraViewImg'>`;
        html +=   "</div>";
        html += "</div>";
        this.targetElem.html(html);

        if(this.config.params.selector)
        {
            this.selConfig = {
                id: this.selSelectId,
                label: "",
                type: "selector",
                size: [0, 0], // means we're in control of layout
                params: {
                    ntkey: this.config.ntkeys[0],
                    width: "14em",
                    options: Object.keys(this.config.params.cameras)
                }
            };
            let el = $(`#${this.selWidgetId}`);
            this.selConfig.widget = new SelectorWidget(this.selConfig, el);
        }
        else
            this.selConfig = null;

        app.debug("cameras.js constructed");
    }

    // cleanup is called when changing pages as well as when a the
    //   camera source changes.
    cleanup()
    {
        try
        {
            app.info("cleanup cameras");
            if(this.imgEl)
            {
                // apparently successful attempt to plug memory leak for mjpgstreamer
                // biggest issue was bandwidth consumption increases with each
                // redraw...  Validation: switch between cameras and between tabs,
                // while keeping an eye on bandwidth consumption (via TaskManager etc).
                this.imgEl.src = "";
                this.imgEl = null;
            }
            if(this.streamHandler)
            {
                if(this.isStreaming)
                    this.streamHandler.hangup(); // hangup takes a little while
                this.streamHandler = null;
                this.isStreaming = false;
                this.vidEl = null;
            }
        }
        catch(msg)
        {
            app.error(msg);
        }
    }

    valueChanged(key, value, isNew)
    {
        this._updateOverlaySize(document.getElementById(this.divId));
        this.cleanup();
        // we need to wait a bit for cleanup to "take".
        setTimeout(function() {
            this._updateCamera(key, value, isNew);
        }.bind(this), 1000);
    } 

    addRandomPt()
    {
        // intentionally left blank
    }

    _updateCamera(key, value, isnew)
    {
        app.debug("_updateCamera");
        let cam = this.config.params.cameras[value];
        if(!cam)
        {
            app.warning("invalid camera view " + value);
            let camhtml = "<div class='cameraViewImg invalid'><i class='amber'>invalid camera</i></div>";
            $(`#${this.divId}`).html(camhtml);
        }
        else
        {
            // cam: {ip, url, cls}
            if(this.selConfig)
                this.selConfig.widget.valueChanged(key, value, isnew);
            app.info("change camera: " + value);
            let camhtml;
            if(!cam.protocol || cam.protocol === "http")
            {
                // mjpegstreaming
                if(cam.url)
                    camhtml = `<img id="${this.imgId}" src="http://${cam.ip}${cam.url}" class="${cam.cls}"></img>`;
                else
                    camhtml = `<img id="${this.imgId}"></img>`;
                $(`#${this.divId}`).html(camhtml);
                this._onImgChange();
            }
            else
            if(cam.protocol == "img")
            {
                // static image
                let camhtml = `<img id="${this.imgId}" src="${cam.url}" class="${cam.cls}"/>`;
                $(`#${this.divId}`).html(camhtml);
                this._onImgChange();
            }
            else
            if(cam.protocol == "testpattern")
            {
                // static image from our collection
                const testimgs = [
                        "/images/standby.jpg",
                        "/images/pleasestandby.jpg",
                        "/images/nosignal.jpg",
                        "/images/offair.jpg",
                        "/images/colortest.jpg",
                        "/images/testbeeld1956.jpg",
                        "/images/underattack.jpg",
                            ];
                let i = Math.floor(Math.random() * testimgs.length);
                let img = testimgs[i];
                let camhtml = `<img id="${this.imgId}" src="${img}" class="${cam.cls}"/>`;
                $(`#${this.divId}`).html(camhtml);
                this._onImgChange();
            }
            else
            if(cam.protocol == "ws")
            {
                // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
                //  autoplay requires page interaction unless muted.
                let camhtml = `<video muted id="${this.vidId}" class="${cam.cls}"></video>`;
                camhtml += "<div id='vidMsg'></div>";
                $(`#${this.divId}`).html(camhtml);
                this.vidEl = document.getElementById(this.vidId);
                let url = `ws:${cam.ip}${cam.url}`;
                this.streamHandler = new WebRTCSignaling(url,
                                        cam.vformat,
                                        this._onStreamOpen.bind(this),
                                        this._onStreamError.bind(this),
                                        this._onStreamClose.bind(this),
                                        this._onStreamMsg.bind(this)
                                        );
            }
            else
            {
                app.error("unknown camera protocol " + cam.protocol);
            }
        }
    }

    //
    // _onImgChange is called after we change cameras and thus the page html...
    //   Note that the size of the image isn't known until it is received.
    _onImgChange()
    {
        // make sure our overlay canvas is the correct size and location
        app.debug("cameras._onImgChange");
        this.imgEl = document.getElementById(this.imgId); // may not exist
        if(this.imgEl)
        {
            // need to learn size after its loaded
            this.imgEl.addEventListener("load", function()
            {
                app.debug("cameras img loaded width:" + this.imgEl.width);
                this._updateOverlaySize(this.imgEl);
            }.bind(this));
        }
    }

    // _onCanPlay only called when we're in video-feed mode
    _onCanPlay()
    {
        app.debug("cameras._onCanPlay");
        this.isStreaming = true;
        this._updateOverlaySize(this.vidEl);
    }

    _onStreamOpen(stream)
    {
        app.notice("video stream opened");
        this.vidEl.srcObject = stream;

        // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
        let playPromise = this.vidEl.play();
        if(playPromise != undefined)
        {
            playPromise.then(function()
            {
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
            this.vidEl.addEventListener("canplay", this._onCanPlay.bind(this));
        }
    }

    _onStreamClose()
    {
        app.notice("video stream closed");
        if(this.vidEl)
            this.vidEl.srcObject = null;
        if(this.overlayCtx)
            this.overlayCtx.clearRect(0, 0, this.overlayEl.width, this.overlayEl.height);
        this.isStreaming = false;
        this.streamHandler = null;
    }

    _onStreamError(msg)
    {
        app.error("video stream error: " + msg);
        let v = document.getElementById(`${this.vidId}`);
        v.srcObject = null;
    }

    _onStreamMsg(msg)
    {
        app.warning("video stream message:" + msg);
        let vmsg = document.getElementById("vidMsg");
        if(vmsg)
            vmsg.innerHTML = `<span class="WARNING">${msg}</span>`;
    }

    _updateOverlaySize(el)
    {
        if(this.config.params.overlayId != undefined)
        {
            let oid = this.config.params.overlayId;
            let w = this.pageHandler.getWidgetById(oid);
            if(w)
                w.placeOver(el);
            else
                app.warning("can't find overlay widget: " + oid);
        }
    }
}

Widget.AddWidgetClass("cameras", CamerasWidget);