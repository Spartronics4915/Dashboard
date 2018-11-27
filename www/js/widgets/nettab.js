class NetTabWidget extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        let w = this.config;

        let html = "<div class='containerrow'>";
        html += "<span class='title'>networktables</span>";
        html +=  "<label>Filter</label> ";
        html +=  "<input id='ntfilter' style='width:7em'></input>";
        html += "</div> <hr/>";
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