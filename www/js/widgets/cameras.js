/* global SelectorWidget, Widget, $, app */
class CamerasWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        let html = "";
        this.baseId = this.config.id;
        this.selWidgetId = `${this.baseId}Sel`; // container for select widget
        this.selSelectId = this.config.ntkeys[0]; // ie: /SmartDashboard/CameraView
        this.imgId = `${this.baseId}Img`;
        html += "<div class='container'>";
        html +=     "<div class='containerrow xtrapad'>";
        html +=        "<span class='title'>Camera View</span>";
        html +=        `<div id='${this.baseId}Sel' class='custom-select-container'>`;
        html +=        "</div>";
        html +=     "</div>";
        html +=     `<div id='${this.imgId}' class='cameraViewImg'>`;
        html +=     "</div>";
        html += "</div>";
        targetElem.html(html);
        this.selConfig = {
            id: this.selSelectId,
            label: "",
            type: "selector",
            size: [0, 0], // means we're in control of layout
            params: {
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
            camhtml = `<img src="http://${cam.ip}${cam.url}" class="${cam.cls} cameraViewImg"></img>`;
        }
        $(`#${this.imgId}`).html(camhtml);
    }

    addRandomPt()
    {
        // no-op
    }
}

Widget.AddWidgetClass("cameras", CamerasWidget);