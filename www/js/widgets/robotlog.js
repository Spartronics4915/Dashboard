/* global app, SelectorWidget */

class RobotLogWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem);
        let w = this.config;
        let html = "<div class='flex'>";
        html += "<span class='bigfont'>robologs</span> &nbsp;&nbsp;<label>Filter</label>";
        html += "<input id='filter' style='width:7em'></input>";
        html += "<div id='verbosityWidget' class='custom-select-container' style='width:250px'></div>";
        html += "<label>";
        html +=  "<i>&nbsp;&nbsp;&nbsp; - reloading this page clears the logs</i>";
        html += "</label>";
        html += "</div> <hr/>";
        html += "<div id='robotlogMsgs'><!-- messages are added here --></div>";
        targetElem.html(html);

        this.wconfig = {
            id: "Robot/Verbosity",
            label: "Robot Verbosity",
            type: "selector",
            size: [0, 0], // ignored since we're in charge of layout
            ntkeys: ["/SmartDashboard/Robot/Verbosity"],
            params: {
                width: "8em", // space for arrow
                options: [
                    "NOTICE", "INFO", "DEBUG"
                ]
            }

        };
        let el = $("#verbosityWidget");
        this.wconfig.widget = new SelectorWidget(this.wconfig, el);
        if(pageHandler)
            pageHandler.setNetTabHandler(this.wconfig.ntkeys, this.wconfig);

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