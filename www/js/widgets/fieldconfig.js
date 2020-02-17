/* global $ app Widget */
class FieldConfig extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        if(!config.params) config.params = {};

        let gstyle = pageHandler.getGridStyler();
        let html="";
        //  fieldconfig:
        //      alliance(Red/Blue) station(0/1/2) (gamemsg) camerasel
        // html += "<div class='container gridded'>";
        html += ` <div ${gstyle([40, "row"], "padding-top:5px")}>`;
        html +=     `<span class='label'>${this.config.label} </span>`;
        html +=     "<span id='allianceColor' class='amber'>";
        html +=         "<span id='alliance'>No Alliance</span>, ";
        html +=         "Station <span id='allianceStation'>?</span>, ";
        html +=         "(<span id='fmsGameMSG'>¯\\_(ツ)_/¯</span>) ";
        html +=     "</span>";
        html += " </div>";
        // html += "</div>";

        targetElem.html(html);
    }

    valueChanged(key, value, isNew)
    {
        switch(key)
        {
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