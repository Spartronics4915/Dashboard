/* global $ app Widget SelectorWidget */
class FieldConfig extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);

        let html="";
        // Field Configuration  alliance (Red/Blue)  station (0/1/2) gamemsg
        html += "<div class='container'>";
        html +=     "<div class='containerrow xtrapad'>";
        html +=         "<span class='title'>Field Config</span>";
        html +=         "<span id='allianceColor' class='amber'>";
        html +=             "<span id='alliance'>unknown alliance</span>";
        html +=             ", Station <span id='allianceStation'>?</span>";
        html +=             ", (<span id='fmsGameMSG'>¯\\_(ツ)_/¯</span>)";
        html +=         "</span>";
        html +=     "</div>";
        // Auto Strategy (filled with our custom selector widget below)
        html +=     "<div class='containerrow'>";
        html +=         "<span class='title'>AutoStrategy</span>";
        html +=         "<div id='strategyWidget' class='custom-select-container'>";
        html +=         "</div>";
        html +=     "</div>";
        html += "</div>";
        targetElem.html(html);

        this.strategyConfig = {
            id: "/SmartDashboard/AutoStrategy",
            label: "",
            type: "selector",
            size: [0, 0], // ignored since we're in charge of layout (above)
            params: {
                width:"15em",
                options: [
                    "<i>no strategy</i>",
                ]
            }
        };
        let el = $("#strategyWidget");
        this.strategyConfig.widget = new SelectorWidget(this.strategyConfig, el);
        // no need to expose ntkey for selector, we distribute it below
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
            break;
        }
    }

    addRandomPt()
    {
        // no-op
    }

}

Widget.AddWidgetClass("fieldconfig", FieldConfig);