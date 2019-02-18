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
        this.canvId = `${this.baseId}Canv`;
        this.vidEl = null;
        this.imgEl = null;
        this.overlay = false;
        this.overlayEl = null;
        this.overlayCtx = null;
        this.opencvEl = null;
        this.opencvCtx = null;
        this.dooverlay = false;
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

        if(this.config.params.overlay &&
            this.config.params.overlay.enable &&
            this.config.params.overlay.updateinterval)
        {
            app.registerPageIdler(this.onIdle.bind(this),
                    this.config.params.overlay.updateinterval,
                    "cameras");
        }
        app.debug("cameras.js constructed");
    }

    onIdle()
    {
        if(this.overlay || false)
            this._updateOverlay();
    }

    getHiddenNTKeys()
    {
        // Always expose our enabled hidden nt keys since this is only
        // called during page-load and a camera-switch may occur that
        // changes the overlay enabled state.
        // Overlay items may listen on the same key and we don't
        // redundant updates.
        if(!this.config.params.overlay) return;

        let hkeyMap = {};
        let camkey = this.config.ntkeys[0];
        for(let item of this.config.params.overlay.items)
        {
            if(item.key == camkey) continue;
            if(item.enable === undefined || item.enable)
                hkeyMap[item.key] = true;
        }
        return Object.keys(hkeyMap);
    }

    valueChanged(key, value, isNew)
    {
        if(this.config.ntkeys[0] == key) // expect a single key
            this._updateCamera(key, value, isNew);
        this._updateOverlay(key, value, isNew);
    }

    _updateCamera(key, value, isnew)
    {
        app.debug("_updateCamera");
        let cam = this.config.params.cameras[value];
        // allow for per-cam enabling of overlay
        this.overlay = false; // no overlays until proven otherwise
        if(cam && (cam.overlay || cam.overlay == undefined))
        {
            if(this.config.params.overlay && this.config.params.overlay.enable)
            {
                // signal we have overlays and they are enabled
                this.overlay = this.config.params.overlay;
            }
        }

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
                if(this.overlay)
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
                $(`#${this.divId}`).html(camhtml);
                this._onDOMChange();
            }
            else
            if(cam.protocol == "img")
            {
                // static image
                let camhtml = `<img id="${this.imgId}" src="${cam.url}" class="${cam.cls}"/>`;
                if(this.overlay)
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
                if(this.overlay)
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
                if(this.overlay)
                    camhtml += `<canvas id="${this.canvId}" class="videoOverlay"></canvas>`;
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

    //
    // _onDOMChange is called after we change cameras and thus the page html...
    //   Note that the size of the image or video isn't known until it is
    //   received.
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
        // overlay and opencv canvases are cleaned up with DOM since they
        // are children of targetElem
        this.overlayCtx = null; // only valid after we know video/img size
        this.opencvEl = null;
        if(this.config.params.overlay)
        {
            for(let item of this.config.params.overlay.items)
            {
                // cleanup items ref to imdata
                if(item.class == "opencv")
                    item.imdata = null;
            }
        }
        this.overlayEl = document.getElementById(`${this.canvId}`);
        this.vidEl = document.getElementById(`${this.vidId}`); // may not exist
        this.imgEl = document.getElementById(`${this.imgId}`); // may not exist
        if(this.overlay && !this.overlayEl)
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
                    if(this.overlay)
                    {
                        this.overlayEl.style.left = this.imgEl.offsetLeft + "px";
                        this.overlayEl.style.top = this.imgEl.offsetTop + "px";
                        this.overlayEl.setAttribute("width", this.imgEl.offsetWidth);
                        this.overlayEl.setAttribute("height", this.imgEl.offsetHeight);
                        this.overlayCtx = this.overlayEl.getContext("2d");
                        this._updateOverlay();
                    }
                }.bind(this));
            }
            else
            if(!this.vidEl)
                app.error("cameras is missing video/img el");
            // nb: we update size of video after the stream is opened.
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
        if(!this.overlay) return;

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
        if(this.overlay)
        {
            this.overlayEl.style.left = this.vidEl.offsetLeft + "px";
            this.overlayEl.style.top = this.vidEl.offsetTop + "px";
            this.overlayEl.setAttribute("width", this.vidEl.offsetWidth);
            this.overlayEl.setAttribute("height", this.vidEl.offsetHeight);
            this.overlayCtx = this.overlayEl.getContext("2d");
            this._updateOverlay();
        }
    }

    // _updateOverlay should be called on any nettab change whether
    //  overlays are enabled or not. This allows us to keep the
    //  correct values in place should a camera-switch occur that
    //  requests overlays.
    _updateOverlay(key, value, isNew)
    {
        // always update overlay values to avoid missing nettab event
        if(!this.config.params.overlay || !this.config.params.overlay.enable)
            return;

        let updateItem = null;
        for(let item of this.config.params.overlay.items)
        {
            if(item.enable == undefined || item.enable)
            {
                // key may be undefined
                if(key == item.key)
                {
                    item.value = value;
                    if(!updateItem && item.class == "opencv")
                    {
                        // only one opencv item per iteration (per key)
                        updateItem = item;
                    }
                }
            }
        }

        // only draw into canvas after we're fully synced with img/video source
        if(!this.overlay) return;
        if(!this.overlayEl) return;
        if(!this.overlayCtx) return;

        app.debug("updateOverlay " + (key ? key : "<domchange>"));
        var w = this.overlayEl.getAttribute("width");
        var h = this.overlayEl.getAttribute("height");

        if(updateItem && updateItem.enable)
        {
            if(!app.opencv || !app.opencv.loaded)
                app.debug("cv not loaded yet");
            else
            {
                if(!this.opencvEl)
                {
                    // In order to apply opencv, we must allocate a canvas
                    // and populate it with pixels from the video.  This canvas
                    // is invisible to users.
                    this.opencvEl = document.createElement("canvas");
                    this.opencvEl.width = w; // w, h are size of overlay
                    this.opencvEl.height = h;
                    // this.opencvEl.style.position = "absolute";
                    this.opencvEl.style.display = "none";
                    this.targetElem[0].appendChild(this.opencvEl);
                    this.opencvCtx = this.opencvEl.getContext("2d");
                }
                if(this.vidEl)
                {
                    // this.vidEl.visibility = "hidden";
                    this.opencvCtx.drawImage(this.vidEl, 0, 0, w, h);
                }
                else
                if(this.imgEl)
                {
                    // this.imgEl.visibility = "hidden";
                    this.opencvCtx.drawImage(this.imgEl, 0, 0, w, h);
                }
                else
                {
                    app.warning("opencv has nothing to do");
                }
                // process the image
                // http://ucisysarch.github.io/opencvjs/examples/img_proc.html
                var input = this.opencvCtx.getImageData(0, 0, w, h);
                var src = cv.matFromArray(input.height, input.width, cv.CV_8UC4,
                                        input.data); // canvas holds rgba
                cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
                switch(updateItem.pipeline)
                {
                case "blur":
                    {
                        let output = new cv.Mat();
                        cv.blur(src, output, [10, 10], [-1, -1], 4);
                        cv.flip(output, output, -1);
                        updateItem.imdata = this._getImgData(output, 128);
                        output.delete();
                    }
                    break;
                case "canny":
                    {
                        let output = new cv.Mat();
                        let blurred = null; // new cv.Mat();
                        let cthresh = 50; // higher means fewer edges
                        let cc = [100, 0, 200];
                        if(blurred)
                        {
                            cv.blur(src, blurred, [5, 5], [-1, -1], 4);
                            cv.Canny(blurred, output, cthresh, cthresh*2, 3, 0);
                        }
                        else
                            cv.Canny(src, output, cthresh, cthresh*2, 3, 0);
                        updateItem.imdata = this._getImgData(output, 0, cc);
                        if(blurred)
                            blurred.delete();
                        output.delete();
                    }
                    break;
                default:
                    app.warning("unimplemented opencv pipeline " + updateItem.pipeline);
                    break;
                }
                src.delete();
            }
        }

        // good to go
        app.debug("drawOverlay");
        this.overlayCtx.clearRect(0, 0, w, h);
        // see also: https://www.google.com/search?q=spaceship+docking+hud
        for(let item of this.overlay.items)
        {
            if(!item.enable) continue;
            switch(item.class)
            {
            case "time":
                item.value = new Date().toLocaleTimeString();
                // fall through
            case "text":
                // if(0)
                {
                    this.overlayCtx.save();
                    this.overlayCtx.fillStyle = item.fillStyle;
                    this.overlayCtx.font = item.font;
                    this.overlayCtx.shadowColor =  "rgba(0,0,0,.8)";
                    this.overlayCtx.shadowOffsetX = 3;
                    this.overlayCtx.shadowOffsetY = 3;
                    this.overlayCtx.shadowBlur = 3;
                    this.overlayCtx.fillText(item.value ? item.value : "<no label>",
                                item.origin[0], item.origin[1]);
                    this.overlayCtx.restore();
                }
                break;
            case "circle":
                // expect value string "x, y, r [, strokewidth]"
                // for multiple circles, we currently require multiples-of-4
                // if(0)
                {
                    let vals = item.value.split(",");
                    if(vals.length >= 3)
                    {
                        let stroke = false;
                        let fill = false;
                        this.overlayCtx.save();
                        if(item.fillStyle)
                        {
                            this.overlayCtx.fillStyle = item.fillStyle;
                            fill = true;
                        }
                        if(item.strokeStyle)
                        {
                            this.overlayCtx.strokeStyle = item.strokeStyle;
                            stroke = true;
                        }
                        this.overlayCtx.lineWidth = 2;
                        for(let i=0;i<vals.length;i+=4)
                        {
                            if(i+3<vals.length)
                                this.overlayCtx.lineWidth = vals[i+3];
                            CanvasUtils.circle(this.overlayCtx, 
                                                vals[i], vals[i+1], vals[i+2],
                                                stroke, fill);
                        }
                        this.overlayCtx.restore();
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
                        this.overlayCtx.save();
                        if(item.fillStyle)
                        {
                            this.overlayCtx.fillStyle = item.fillStyle;
                            fill = true;
                        }
                        if(item.strokeStyle)
                        {
                            this.overlayCtx.strokeStyle = item.strokeStyle;
                            stroke = true;
                        }
                        this.overlayCtx.lineWidth = (vals.length >= 6) ? vals[5]:3;
                        CanvasUtils.roundRect(this.overlayCtx,
                                            vals[0], vals[1], vals[2], vals[3],
                                            (vals.length >= 5) ? vals[4] : 0, // radius
                                            stroke, fill);
                        this.overlayCtx.restore();
                    }
                }
                break;
            case "opencv":
                {
                    if(item.imdata)
                    {
                        this.overlayCtx.save();
                        this.overlayCtx.globalCompositeOperation = "destination-over";
                        this.overlayCtx.putImageData(item.imdata, 0, 0);
                        // this.overlayCtx.drawImage(item.imdata, 0, 0);
                        this.overlayCtx.restore();
                    }
                }
                break;
            }
        }
    }

    // convert from opencv to canvas img data
    // see: https://docs.opencv.org/3.4/de/d06/tutorial_js_basic_ops.html
    _getImgData(cvMat, maxOpac, colorize)
    {
        var type = cvMat.type();
        if(type != cv.CV_8U)
        {
            app.error("invalid opencv type:" + type);
            return null;
        }
        var cont = cvMat.isContinuous();
        if(!cont)
        {
            app.error("opencv mat expected to be continous");
            return null;
        }
        var nchan = cvMat.channels();
        var imgdata = this.opencvCtx.createImageData(cvMat.cols, cvMat.rows);
        var idata = imgdata.data;
        var cvdata = cvMat.data;
        if(nchan == 1)
        {
            if(!colorize)
            {
                for(let i=0,j=0;i<idata.length;i+=nchan)
                {
                    let d = cvdata[i];
                    idata[j++] = d;
                    idata[j++] = d;
                    idata[j++] = d;
                    imgdata.data[j++] = maxOpac > 0 ? maxOpac : (d ? 255 : 0);
                }
            }
            else
            {
                for(let i=0,j=0;i<idata.length;i+=nchan)
                {
                    let d = cvdata[i];
                    idata[j++] = Math.floor(colorize[0]*d / 255);
                    idata[j++] = Math.floor(colorize[1]*d / 255);
                    idata[j++] = Math.floor(colorize[2]*d / 255);
                    imgdata.data[j++] = maxOpac > 0 ? maxOpac : (d ? 255 : 0);
                }
            }
        }
        else
        if(nchan == 3 || nchan == 4)
        {
            for(let i=0,j=0;i<idata.length;i+=nchan)
            {
                idata[j++] = cvdata[i]; // j % 255;
                idata[j++] = cvdata[i+1];
                idata[j++] = cvdata[i+2];
                imgdata.data[j++] = maxOpac;
            }
        }
        else
            app.error("unexpected opencv mat.nchan " + nchan);
        return imgdata;
    }

    _filterFrame()
    {
        // this is inactive, but here for reference in the case where
        // we wish to process the incoming video.
        app.debug("cameras._filterFrame");
        if(!this.overlayEl || true)
            return;
        // install callback
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
        if(this.overlayCtx)
            this.overlayCtx.clearRect(0, 0, this.overlayEl.width, this.overlayEl.height);
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