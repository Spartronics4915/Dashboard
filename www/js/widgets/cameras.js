/* global SelectorWidget, Widget, $, app, WebRTCSignaling, CanvasUtils */

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
        this.canvId = `${this.baseId}Canv`;
        this.dooverlay = false;
        this.streamHandler = null;
        this.isStreaming = false;

        html += "<div class='container'>";

        if(this.config.params.selector)
        {
            html +=     "<div class='containerrow xtrapad'>";
            html +=        `<span class='title'>${this.config.label}</span>`;
            html +=        `<div id='${this.selWidgetId}'></div>`;
            html +=     "</div>";
        }

        html +=     `<div id='${this.divId}' class='cameraViewImg'>`;
        html +=     "</div>";
        html += "</div>";
        targetElem.html(html);

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

        if(this.config.params.overlay && this.config.params.overlay.enable)
            this.overlay = this.config.params.overlay;
        else
            this.overlay = null;
    }

    getHiddenNTKeys()
    {
        if(!this.overlay)
            return null;
        else
        {
            // we may be listening on the camera key and don't want
            // double-updates above.
            let hiddenKeys = Object.keys(this.overlay.items);
            let i = hiddenKeys.indexOf(this.config.ntkeys[0]);
            if(i != -1)
                hiddenKeys.splice(i, 1);
            return hiddenKeys;
        }
    }

    valueChanged(key, value, isNew)
    {
        if(this.config.ntkeys[0] == key) // expect a single key
            this._updateCamera(key, value, isNew);
        this._updateOverlay(key, value, isNew);
    }

    // _onDOMChange is called after we change the page html... Note
    //  that the size of the image or video isn't known until it is received.
    _onDOMChange()
    {
        // make sure our overlay canvas is the correct size and location
        app.debug("cameras._onDOMChange");
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
            this.vidEl = null;
            this.streamHandler.hangup();
            this.streamHandler = null;
            this.isStreaming = false;
        }
        this.canvCtx = null; // only valid after we know video/img size

        this.canvEl = document.getElementById(`${this.canvId}`);
        this.vidEl = document.getElementById(`${this.vidId}`); // may not exist
        this.imgEl = document.getElementById(`${this.imgId}`); // may not exist
        if(!this.canvEl)
        {
            if(this.config.params.overlay)
                app.warning("cameras is missing canvEl");
        }
        else
        {
            if(this.imgEl)
            {
                // need to learn size after its loaded
                this.imgEl.addEventListener("load", function()
                {
                    app.debug("cameras img loaded width:" + this.imgEl.width);
                    this.canvEl.style.left = this.imgEl.offsetLeft + "px";
                    this.canvEl.style.top = this.imgEl.offsetTop + "px";
                    this.canvEl.setAttribute("width", this.imgEl.width);
                    this.canvEl.setAttribute("height", this.imgEl.height);
                    this.canvCtx = this.canvEl.getContext("2d");
                    this._updateOverlay();
                }.bind(this));
            }
            else
            if(!this.vidEl)
                app.error("cameras is missing video/img el");
            // nb: we update size of video after the stream is opened.
        }
    }

    _updateCamera(key, value, isnew)
    {
        let cam = this.config.params.cameras[value];
        if(!cam)
        {
            app.warning("invalid camera view " + value);
            let camhtml = "<div class='cameraViewImg invalid'><i class='amber'>invalid camera</i></div>";
            $(`#${this.divId}`).html(camhtml);
            this._onDOMChange();
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
                if(this.config.params.overlay)
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
                $(`#${this.divId}`).html(camhtml);
                this._onDOMChange();
            }
            else
            if(cam.protocol == "img")
            {
                // static image
                let camhtml = `<img id="${this.imgId}" src="${cam.url}" class="${cam.cls}"/>`;
                if(this.config.params.overlay)
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
                $(`#${this.divId}`).html(camhtml);
                this._onDOMChange();
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
                        "/images/underattack.jpg"
                            ];
                let i = Math.floor(Math.random() * testimgs.length);
                let img = testimgs[i];
                let camhtml = `<img id="${this.imgId}" src="${img}" class="${cam.cls}"/>`;
                if(this.config.params.overlay)
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
                $(`#${this.divId}`).html(camhtml);
                this._onDOMChange();
            }
            else
            if(cam.protocol == "ws")
            {
                // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
                //  autoplay requires page interaction unless muted.
                let camhtml = `<video muted id="${this.vidId}" class="${cam.cls}"></video>`;
                if(this.config.params.overlay)
                {
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
                }
                camhtml += "<div id='vidMsg'></div>";
                $(`#${this.divId}`).html(camhtml);
                this._onDOMChange(); // want this before stream callbacks
                let url = `ws:${cam.ip}${cam.url}`;
                this.streamHandler = new WebRTCSignaling(url,
                                        cam.vformat,
                                        this.onStreamOpen.bind(this),
                                        this.onStreamError.bind(this),
                                        this.onStreamClose.bind(this),
                                        this.onStreamMsg.bind(this)
                                        );
            }
            else
            {
                app.error("unknown camera protocol " + cam.protocol);
            }
        }
    }

    _clamp(v, min, max)
    {
        if(v < min) return min;
        else if(v> max) return max;
        else return v;
    }

    addRandomPt()
    {
        if(!this.demoRadius)
        {
            this.demoRadius = 20;
            this.deltaRadius = 2;
        }
        this.demoRadius += this.deltaRadius;
        if(this.demoRadius > 250 || this.demoRadius < 10)
            this.deltaRadius *= -1;
        app.putValue("/SmartDashboard/Driver/CameraOverlay/Circle",
                     `100,100,${this.demoRadius},4`);

        if(!this.demoRect)
        {
            this.demoRect = [300, 250, 30, 50, 10, 2]; // x,y,w,h,r,linewidth
            this.deltaRect = [5, 8, 2, .2];
        }
        // play with w, h
        this.demoRect[2] += this.deltaRect[0];
        if(this.demoRect[2] > 250 || this.demoRect[2] < 15)
            this.deltaRect[0] *= -1;
        this.demoRect[3] += this.deltaRect[1];
        if(this.demoRect[3] > 250 || this.demoRect[3] < 30)
            this.deltaRect[1] *= -1;

        // play with radius
        this.demoRect[4] += this.deltaRect[2];
        if(this.demoRect[4] > 12 || this.demoRect[4] < 1)
            this.deltaRect[2] *= -1;

        // play with linewidth
        this.demoRect[5] += this.deltaRect[3];
        if(this.demoRect[5] > 12 || this.demoRect[5] < 1)
            this.deltaRect[3] *= -1;

        app.putValue("/SmartDashboard/Driver/CameraOverlay/Rect",
                        this.demoRect.join(","));
    }

    // _onCanPlay only called when we're in video-feed mode
    _onCanPlay()
    {
        app.debug("cameras._onCanPlay");
        this.isStreaming = true;
        if(this.config.params.overlay)
        {
            this.canvEl.style.left = this.vidEl.offsetLeft + "px";
            this.canvEl.style.top = this.vidEl.offsetTop + "px";
            this.canvEl.setAttribute("width", this.vidEl.videoWidth);
            this.canvEl.setAttribute("height", this.vidEl.videoHeight);
            this.canvCtx = this.canvEl.getContext("2d");
            this._updateOverlay();
        }
    }

    _updateOverlay(key, value, isNew)
    {
        if(!this.overlay) return;

        // always update overlay values to avoid missing nettab event
        app.debug("updateOverlay");
        if(key)
        {
            for(const ntkey in this.overlay.items)
            {
                let item =  this.overlay.items[ntkey];
                if(key == ntkey)
                    item.value = value;
            }
        }

        // only draw into canvas after we're fully synced with img/video source
        if(!this.canvEl) return;
        if(!this.canvCtx) return;

        // good to go
        app.debug("drawOverlay");
        var w = this.canvEl.getAttribute("width");
        var h = this.canvEl.getAttribute("height");
        this.canvCtx.clearRect(0, 0, w, h);
        // see also: https://www.google.com/search?q=spaceship+docking+hud
        for(const ntkey in this.overlay.items)
        {
            let item =  this.overlay.items[ntkey];
            switch(item.class)
            {
            case "text":
                // if(0)
                {
                    this.canvCtx.save();
                    this.canvCtx.fillStyle = item.fillStyle;
                    this.canvCtx.font = item.font;
                    this.canvCtx.shadowColor =  "rgba(0,0,0,.8)";
                    this.canvCtx.shadowOffsetX = 3;
                    this.canvCtx.shadowOffsetY = 3;
                    this.canvCtx.shadowBlur = 3;
                    this.canvCtx.fillText(item.value ? item.value : "<no label>",
                                item.origin[0], item.origin[1]);
                    this.canvCtx.restore();
                }
                break;
            case "circle":
                // expect value string "x, y, r [, strokewidth]"
                // if(0)
                {
                    let vals = item.value.split(",");
                    if(vals.length >= 3)
                    {
                        let stroke = false;
                        let fill = false;
                        this.canvCtx.save();
                        if(item.fillStyle)
                        {
                            this.canvCtx.fillStyle = item.fillStyle;
                            fill = true;
                        }
                        if(item.strokeStyle)
                        {
                            this.canvCtx.strokeStyle = item.strokeStyle;
                            stroke = true;
                        }
                        this.canvCtx.lineWidth = (vals.length == 4) ?  vals[3] : 2;
                        CanvasUtils.circle(this.canvCtx, vals[0], vals[1], vals[2],
                                        stroke, fill);
                        this.canvCtx.restore();
                    }
                }
                break;
            case "rect":
                // expect value string "x0, y0, width, height, [cornerradius [, strokewidth]]"
                // if(0)
                {
                    let vals = item.value.split(",");
                    if(vals.length >= 4)
                    {
                        let stroke = false;
                        let fill = false;
                        this.canvCtx.save();
                        if(item.fillStyle)
                        {
                            this.canvCtx.fillStyle = item.fillStyle;
                            fill = true;
                        }
                        if(item.strokeStyle)
                        {
                            this.canvCtx.strokeStyle = item.strokeStyle;
                            stroke = true;
                        }
                        this.canvCtx.lineWidth = (vals.length >= 6) ? vals[5]:3;
                        CanvasUtils.roundRect(this.canvCtx,
                                            vals[0], vals[1], vals[2], vals[3],
                                            (vals.length >= 5) ? vals[4] : 0, // radius
                                            stroke, fill);
                        this.canvCtx.restore();
                    }
                }
                break;
            }
        }
    }

    _onPlay()
    {
        // this is inactive, but here for reference in the case where
        // we wish to process the incoming video.
        app.debug("cameras._onPlay");
        if(!this.canvEl || true)
            return;

        // Every 33 milliseconds... copy video to canvas. So we
        // can operate on it locally.  If we only wish to view the video
        // feed the canvas isn't needed.
        setInterval(function()
        {
            if(this.vidEl.paused || this.vidEl.ended)
                return;
            var w = this.canvEl.getAttribute("width");
            var h = this.canvEl.getAttribute("height");
            this.canvCtx.fillRect(0, 0, w, h);
            this.canvCtx.drawImage(this.vidEl, 0, 0, w, h);
            // here's where we can operate on the image-in-canvas
            // var input = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // var img = cv.matFromArray(input, 24); // 24 for rgba
            // var imgGray = new cv.Mat();
            // var imgColor = new cv.Mat(); // Opencv likes RGB
            // cv.cvtColor(img, imgGray, cv.ColorConversionCodes.COLOR_RGBA2GRAY.value, 0);
            // cv.cvtColor(img, imgColor, cv.ColorConversionCodes.COLOR_RGBA2RGB.value, 0);
        }.bind(this), 33);
    }

    onStreamOpen(stream)
    {
        app.notice("camera stream opened");
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

    onStreamClose()
    {
        app.notice("camera stream closed");
        if(this.vidEl)
            this.vidEl.srcObject = null;
        if(this.canvCtx)
            this.canvCtx.clearRect(0, 0, this.canvEl.width, this.canvEl.height);
        this.isStreaming = false;
        this.streamHandler = null;
    }

    onStreamError(msg)
    {
        app.error("camera stream error: " + msg);
        let v = document.getElementById(`${this.vidId}`);
        v.srcObject = null;
    }

    onStreamMsg(msg)
    {
        app.warning("stream message:" + msg);
        let vmsg = document.getElementById("vidMsg");
        if(vmsg)
            vmsg.innerHTML = `<span class="WARNING">${msg}</span>`;
    }
}

Widget.AddWidgetClass("cameras", CamerasWidget);