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
        html +=     `<span class='title'>${this.config.label}</span>`;
        html +=     "<span id='allianceColor' class='amber'>";
        html +=         "<span id='alliance'>unknown alliance</span>, ";
        html +=         "Station <span id='allianceStation'>?</span>, ";
        html +=         "(<span id='fmsGameMSG'>¯\\_(ツ)_/¯</span>) ";
        html +=     "</span>";
        html += "</div>";
        // Auto Strategy (filled with our custom selector widget below)
        // html +=     "<span class='title'> Auto Strategy</span> ";
        html += `<div id='strategyWidget' ${gstyle([40, "row"])}></div> `;
        if (this.config.params.cameraSelector)
        {
            let label = this.config.params.cameraSelector.label;
            if(label == undefined) label = "Camera";
            // html +=     `<span class='title'>${label}</span> `;
            html += `<div id='cameraSelector' ${gstyle([40, "row"])}></div>`;
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

        if(this.config.params.cameraSelector)
        {
            this.cameraSelConfig = {
                id: "cameraSelector",
                label: "Camera",
                type: "selector",
                size: [0, 0], // size ignore since we bypass pagehandler.js
                params: {
                    ntkey: this.config.params.cameraSelector.ntkey,
                    width: "14em",
                    options: this.config.params.cameraSelector.options
                }
            };
            el = $("#cameraSelector");
            this.cameraSelConfig.widget = new SelectorWidget(this.cameraSelConfig, el);
        }
        else
            this.cameraSelConfig = null;
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
            if(this.cameraSelConfig && key == this.cameraSelConfig.params.ntkey)
                this.cameraSelConfig.widget.valueChanged(key, value, isNew);
            else
            if(key.indexOf("/FMS") == 0)
                app.info(`unknown FMS key ${key}, value: ${value}`);
            break;
        }
    }

    addRandomPt()
    {
        // no-op
    }

}

Widget.AddWidgetClass("fieldconfig", FieldConfig);