/* global app */
class FieldConfig extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);

        let html="";
        html += "<div class='container'>";
        html +=     "<div style='span-column:60;span-row:4;'>";
        html +=         "Field Configuration &nbsp;&nbsp;";
        html +=         "<span id='alliance'>Unknown alliance</span> ";
        html +=         "Station ";
        html +=         "<span id='allianceStation'>0</span> ";
        html +=         "<span id='fmsGamMSG'>¯\_(ツ)_/¯</span>";
        html +=     "</div>";
            // Strategy
        html += "</div>";
        targetElem.html(html);
    }
}

Widget.AddWidgetClass("fieldconfig", FieldConfig);