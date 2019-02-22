/* global $ app Widget SelectorWidget */
class FieldConfig extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        if(!config.params) config.params = {};

        let gstyle = pageHandler.newGridElemStyle.bind(pageHandler);
        let html="";
        //  fieldconfig:
        //      alliance(Red/Blue) station(0/1/2) (gamemsg) camerasel
        html += "<div class='container gridded'>";
        html += `<div ${gstyle([50, "row"], "padding-top:5px")}>`;
        html +=     `<span class='label'>${this.config.label} </span>`;
        html +=     "<span id='allianceColor' class='amber'>";
        html +=         "<span id='alliance'>unknown alliance</span>, ";
        html +=         "Station <span id='allianceStation'>?</span>, ";
        html +=         "(<span id='fmsGameMSG'>¯\\_(ツ)_/¯</span>) ";
        html +=     "</span>";
        html += "</div>";
        // Auto Strategy (filled with our custom selector widget below)
        // html +=     "<span class='title'> Auto Strategy</span> ";
        html += `<div id='strategyWidget' ${gstyle([40, "row"])}></div> `;
        if (this.config.params.camera1Selector)
        {
            let label = this.config.params.camera1Selector.label;
            if(label == undefined) label = "Camera";
            // html +=     `<span class='title'>${label}</span> `;
            html += `<div id='cameraSelector1' ${gstyle([40, "row"])}></div>`;
        }
        if (this.config.params.camera2Selector)
        {
            let label = this.config.params.camera2Selector.label;
            if(label == undefined) label = "Camera";
            // html +=     `<span class='title'>${label}</span> `;
            html += `<div id='cameraSelector2' ${gstyle([40, "row"])}></div>`;
        }

        html += "</div>";

        targetElem.html(html);

        // no need to externally expose ntkey for strategy, we distribute it below
        this.strategyConfig = {
            id: "strategyWidget",
            label: "Auto Strategy",
            type: "selector",
            size: [0, 0], // ignored since we bypass pagehandler
            ntkeys: [
                "/SmartDashboard/AutoStrategy",
                "/SmartDashboard/AutoStrategyOptions"
            ],
            params: {
                width:"15em",
                ntkey: "/SmartDashboard/AutoStrategy",
                optionsntkey: "/SmartDashboard/AutoStrategyOptions",
                options: [
                    "<i>no strategy</i>",
                ]
            }
        };
        let el = $("#strategyWidget");
        this.strategyConfig.widget = new SelectorWidget(this.strategyConfig, el);

        this.camSelConfigs = [];
        this._buildCamSelector(this.config.params.camera1Selector);
        this._buildCamSelector(this.config.params.camera2Selector);
    }

    _buildCamSelector(sel)
    {
        if(sel)
        {
            let id = this.camSelConfigs.length+1;
            let camSelConfig =
            {
                id: "cameraSelector" + id,
                label: "Camera" + id,
                type: "selector",
                size: [0, 0], // size ignore since we bypass pagehandler.js
                params: {
                    ntkey: sel.ntkey,
                    width: "8em",
                    options: sel.options
                }
            };
            let el = $("#cameraSelector"+id);
            camSelConfig.widget = new SelectorWidget(camSelConfig, el);
            this.camSelConfigs.push(camSelConfig);
        }
    }

    valueChanged(key, value, isNew)
    {
        switch(key)
        {
        case "/SmartDashboard/AutoStrategyOptions":
            {
                let opts = value.split(","); // assume value is comma-separated
                this.strategyConfig.widget.optionsChanged(opts);
            }
            break;
        case "/SmartDashboard/AutoStrategy":
            this.strategyConfig.widget.valueChanged(key, value, isNew);
            break;
        case "/FMSInfo/IsRedAlliance":
            if(value == false)
            {
                $("#allianceColor").addClass("blue").removeClass("amber red");
                $("#alliance").text("Blue Alliance");
            }
            else
            if(value == true)
            {
                $("#allianceColor").addClass("red").removeClass("amber blue");
                $("#alliance").text("Red Alliance");
            }
            else
            {
                $("#allianceColor").addClass("amber").removeClass("red blue");
                $("#alliance").text("No Alliance");
            }
            break;
        case "/FMSInfo/StationNumber":
            $("#allianceStation").text(value);
            break;
        case "/FMSInfo/GameSpecificMessage":
            $("#fmsGameMSG").text(value);
            // 2018: 3 chars "LRL", means:
            //    our switch on Left
            //    our scale on Right
            //    defense for their switch on Left
            break;
        case "/FMSInfo/ReplayNumber":
            break;
        case "/FMSInfo/FMSControlData":
            break;
        case "/FMSInfo/EventName":
            break;
        case "/FMSInfo/MatchType":
            break;
        case "/FMSInfo/MatchNumber":
            break;
        case "/FMSInfo/.type":
            break;
        default:
            if(key.indexOf("/FMS") == 0)
                app.info(`unknown FMS key ${key}, value: ${value}`);
            else
            {
                for(let camsel of this.camSelConfigs)
                {
                    if(key == camsel.params.ntkey)
                        camsel.widget.valueChanged(key, value, isNew);
                }
            }
            break;
        }
    }

    addRandomPt()
    {
        // no-op
    }

}

Widget.AddWidgetClass("fieldconfig", FieldConfig);