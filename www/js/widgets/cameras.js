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
        let cam = this.config.params.cameras[value];
        let camhtml;
        if(!cam)
        {
            app.warning("invalid camera view " + value);
            camhtml = "<div class='cameraViewImg invalid'><i class='amber'>invalid camera</i></div>";
        }
        else
        {
            // cam: {ip, url, cls}
            if(this.selConfig)
                this.selConfig.widget.valueChanged(key, value, isNew);
            app.info("change camera: " + value);
            this.cleanup();
            if(!cam.protocol || cam.protocol === "http")
            {
                if(cam.url)
                    camhtml = `<img id="${this.imgId}" src="http://${cam.ip}${cam.url}" class="${cam.cls}"></img>`;
                else
                    camhtml = `<img id="${this.imgId}"></img>`;
                $(`#${this.divId}`).html(camhtml);
            }
            else
            if(cam.protocol == "img")
            {
                camhtml = `<img id="${this.imgId}" src="${cam.url}" class="${cam.cls}"/>`;
                $(`#${this.divId}`).html(camhtml);
            }
            else
            if(cam.protocol == "testpattern")
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
                let img = testimgs[i];
                camhtml = `<img id="${this.imgId}" src="${img}" class="${cam.cls}"/>`;
                $(`#${this.divId}`).html(camhtml);
            }
            else
            if(cam.protocol == "ws")
            {
                // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
                //  autoplay requires page interaction unless muted.
                camhtml = `<video muted id="${this.vidId}" class="${cam.cls}"></video>`;
                if(this.config.params.overlay)
                {
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
                }
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
            else
            {
                app.error("unknown camera protocol " + cam.protocol);
            }
        }
    }

    addRandomPt()
    {
        // no-op
    }

    _onCanPlay()
    {
        app.notice("cameras._onCanPlay");
        this.isStreaming = true;
        if(this.config.params.overlay)
        {
            this.sCanv = document.getElementById(`${this.canvId}`);
            this.sCanv.style.left = this.sVid.offsetLeft + "px";
            this.sCanv.style.top = this.sVid.offsetTop + "px";
            this.sCanv.setAttribute("width", this.sVid.videoWidth);
            this.sCanv.setAttribute("height", this.sVid.videoHeight);
            this.sCtx = this.sCanv.getContext("2d");
            this.sCtx.strokeStyle = "#FF0000";
            this.sCtx.lineWidth = 5;
            this.sCtx.fillStyle = "#005050";
            this.sCtx.font = "30px Arial";
            this.sCtx.fillText("Hello World", 200, 200);
            CanvasUtils.roundRect(this.sCtx, 10, 10, 100, 100, 20, false, true);
        }
    }

    _onPlay()
    {
        // Every 33 milliseconds... copy video to canvas. So we
        // can operate on it locally.  If we only wish to view the video
        // feed the canvas isn't needed.
        app.notice("cameras._onPlay");
        if(!this.sCanv)
            return;
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

        // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
        let playPromise = this.sVid.play();
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