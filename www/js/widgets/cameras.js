/* global SelectorWidget, Widget, $, app, StreamHandler */

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
                width: "10em",
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
        if(lastImg)
        {
            // apparently successful attempt to plug memory leak for mjpgstreamer
            // biggest issue was bandwidth consumption increases with each
            // redraw...  Validation: switch between cameras and between tabs, 
            // while keeping an eye on bandwidth consumption (via TaskManager etc).
            lastImg.src = null; 
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
            }
            else
            {
                if(this.streamHandler)
                {
                    this.streamHandler.hangup();
                    this.isStreaming = false;
                }
                let url = `ws:${cam.ip}${cam.url}`;
                this.streamHandler = new StreamHandler(url, 
                                        this.onStreamOpen.bind(this),
                                        this.onStreamError.bind(this),
                                        this.onStreamClose.bind(this),
                                        this.onStreamMsg.bind(this)
                                        );
                camhtml = `<video id="${this.vidId}" class="${cam.cls}"></video>`;
                camhtml += `<canvas id="${this.canvId}" class="${cam.cls}"></canvas>`;
            }
        }
        $(`#${this.divId}`).html(camhtml);
    }

    addRandomPt()
    {
        // no-op
    }

    onStreamOpen(stream)
    {
        app.notice("camera stream opened");
        let v = document.getElementById(`${this.baseId}Vid`);
        v.srcObject = stream;
        v.play();
    }

    onStreamError(msg)
    {
        app.error("camera stream error: " + msg);
        let v = document.getElementById(`${this.baseId}Vid`);
        v.srcObject = null;
    }

    onStreamClose()
    {
        app.notice("camera stream closed");
        let canv = document.getElementById(`${this.baseId}Canv`);
        canv.getContext("2d").clearRect(0, 0, canv.width, canv.height);
        this.isStreaming = false;
        this.streamHandler = null;
    }

    onStreamMsg(msg)
    {
        app.info("stream message:" + msg);
    }
}

Widget.AddWidgetClass("cameras", CamerasWidget);