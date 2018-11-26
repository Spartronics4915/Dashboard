class NetTabWidget extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        let w = this.config;

        let html = "<h3>Network Table Explorer &nbsp; &nbsp;";
        html +=  "<label>Filter</label> ";
        html +=  "<input id='ntfilter' style='width:7em'>";
        html +=  "</input>";
        html += "<hr/></h3>";
        html += "<table id='networktable' border='0'>";
        html +=     "<tbody></tbody>";
        html += "</table>";
        targetElem.html(html);
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

Widget.AddWidgetClass("nettab", NetTabWidget);