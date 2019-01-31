/* global SelectorWidget, Widget, $, app, WebRTCSignaling */

// legacy cams here for reference, now expressed in per-season layout files.
// var piCam = {ip:"10.49.15.10:5080", url: "/cam.mjpg", cls:"rotate0"};
// var dlink13 = {ip:"admin:@10.49.15.13", url: "/video.cgi", cls:"rotate90"};
// var dlink14 = {ip:"admin:@10.49.15.14", url: "/video.cgi", cls:"rotate0"};
// var axis1 = {ip:"10.49.15.11", url: "/mjpg/video.mjpg", cls:"rotate0"};
// var axis2 = {ip:"10.49.15.12", url: "/mjpg/video.mjpg", cls:"rotate0"};
// var usbCam = {ip:"10.49.15.2:1180", url: "/?action=stream", cls:"rotate0"};

class CamerasWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        let html = "";
        this.baseId = this.config.id;
        this.selWidgetId = `${this.baseId}Sel`; // container for select widget
        this.selSelectId = this.config.ntkeys[0]; // ie: /SmartDashboard/CameraView
        this.divId = `${this.baseId}Div`;
        this.imgId = `${this.baseId}Img`;
        this.vidId = `${this.baseId}Vid`;
        this.canvId = `${this.baseId}Canv`;
        this.streamHandler = null;
        this.isStreaming = false;

        html += "<div class='container'>";
        html +=     "<div class='containerrow xtrapad'>";
        html +=        `<span class='title'>${this.config.label}</span>`;
        html +=        `<div id='${this.selWidgetId}'></div>`;
        html +=     "</div>";
        html +=     `<div id='${this.divId}' class='cameraViewImg'>`;
        html +=     "</div>";
        html += "</div>";
        targetElem.html(html);
        this.selConfig = {
            id: this.selSelectId,
            label: "",
            type: "selector",
            size: [0, 0], // means we're in control of layout
            params: {
                ntkey: this.config.ntkeys[0],
                width: "14em",
                options: Object.keys(this.config.params)
            }
        };
        let el = $(`#${this.selWidgetId}`);
        this.selConfig.widget = new SelectorWidget(this.selConfig, el);
    }    
    
    getHiddenNTKeys()
    {
        return null;
    }

    cleanup()
    {
        let lastImg = document.getElementById(this.imgId);
        if(lastImg && lastImg.src)
        {
            // apparently successful attempt to plug memory leak for mjpgstreamer
            // biggest issue was bandwidth consumption increases with each
            // redraw...  Validation: switch between cameras and between tabs, 
            // while keeping an eye on bandwidth consumption (via TaskManager etc).
            lastImg.src = ""; 
        }
        if(this.streamHandler)
        {
            this.sVid = null;
            this.streamHandler.hangup();
            this.streamHandler = null;
            this.isStreaming = false;
        }
    }

    valueChanged(key, value, isNew)
    {
        let cam = this.config.params[value];
        let camhtml;
        if(!cam)
        {
            app.warning("invalid camera view " + value);
            camhtml = "<div class='cameraViewImg invalid'><i class='amber'>invalid camera</i></div>";
        }
        else
        {
            // cam: {ip, url, cls}
            this.selConfig.widget.valueChanged(key, value, isNew);
            app.info("change camera: " + value);
            this.cleanup();
            if(!cam.protocol || cam.protocol === "http")
            {
                camhtml = `<img id="${this.imgId}" src="http://${cam.ip}${cam.url}" class="${cam.cls}"></img>`;
                $(`#${this.divId}`).html(camhtml);
            }
            else
            {
                camhtml = `<video id="${this.vidId}" class="${cam.cls}"></video>`;
                // camhtml += `<canvas id="${this.canvId}" class="${cam.cls}"></canvas>`;
                camhtml += "<div id='vidMsg'></div>";
                $(`#${this.divId}`).html(camhtml);
                let url = `ws:${cam.ip}${cam.url}`;
                this.streamHandler = new WebRTCSignaling(url, 
                                        cam.vformat, 
                                        this.onStreamOpen.bind(this),
                                        this.onStreamError.bind(this),
                                        this.onStreamClose.bind(this),
                                        this.onStreamMsg.bind(this)
                                        );
            }
        }
    }

    addRandomPt()
    {
        // no-op
    }

    _onCanPlay()
    {
        app.debug("cameras._onCanPlay");
        this.isStreaming = true;
        if(this.sCanv)
        {
            this.sCanv.setAttribute("width", this.sVid.videoWidth);
            this.sCanv.setAttribute("height", this.sVid.videoHeight);
            this.sVid.addEventListener("play", this._onPlay.bind(this));
        }
    }

    _onPlay()
    {
        // Every 33 milliseconds... copy video to canvas. So we
        // can operate on it locally.  If we only wish to view the video
        // feed the canvas isn't needed.
        if(!this.sCanv) 
            return;
        app.debug("cameras._onPlay");
        setInterval(function() 
        {
            if(this.sVid.paused || this.sVid.ended)
                return;
            var w = this.sCanv.getAttribute("width");
            var h = this.sCanv.getAttribute("height");
            this.sCtx.fillRect(0, 0, w, h);
            this.sCtx.drawImage(this.sVid, 0, 0, w, h);
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
        this.sVid = document.getElementById(`${this.vidId}`);
        this.sVid.srcObject = stream;
        this.sCanv = document.getElementById(`${this.canvId}`);
        if(this.sCanv)
            this.sCtx = this.sCanv.getContext("2d");
        let playPromise = this.sVid.play();
        if(playPromise != undefined)
        {
            playPromise.then(function()
            {
                // Automatic playback started!
                // Show playing UI.
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
            this.sVid.addEventListener("canplay", this._onCanPlay.bind(this));
        }
    }

    onStreamClose()
    {
        app.notice("camera stream closed");
        if(this.sVid)
            this.sVid.srcObject = null;
        if(this.sCtx)
            this.sCtx.clearRect(0, 0, this.sCanv.width, this.sCanv.height);
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