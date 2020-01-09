/* global app, SelectorWidget, Widget */

class RobotLogWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem);
        let w = this.config;
        let html = "<div class='containerrow'>";
        html += `<span class='title'>${this.config.label}</span> <label>Filter</label>`;
        html += "<input id='filter' style='width:7em'></input>";
        html += "&nbsp;&nbsp;";
        html += "<div id='verbosityWidget'></div>";
        html += "<label>";
        html +=  "<i>&nbsp;&nbsp;&nbsp; - reloading this page clears the logs</i>";
        html += "</label>";
        html += "</div> <hr/>";
        html += "<div id='robotlogMsgs'><!-- messages are added here --></div>";
        targetElem.html(html);

        this.wconfig = {
            type: "selector",
            label: "Robot Verbosity",
            id: "verbosityWidget",
            size: [0, 0], // ignored since we're in charge of layout
            ntkeys: ["/SmartDashboard/Robot/Verbosity"],
            params: {
                ntkey: "/SmartDashboard/Robot/Verbosity",
                width: "8em", // space for arrow
                options: [
                    "NOTICE", "INFO", "DEBUG"
                ]
            }

        };
        let el = $("#verbosityWidget");
        this.wconfig.widget = new SelectorWidget(this.wconfig, el);
    }

    valueChanged(key, value, isNew)
    {
        // no-op, managed explicitly by our pagehandler
    }

    addRandomPt()
    {
        // no-op, managed explicitly by our pagehandler
    }
}

Widget.AddWidgetClass("robotlog", RobotLogWidget);