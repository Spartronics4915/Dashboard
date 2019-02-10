/* global app Widget */

class SystemState extends Widget
{
    constructor(config, targetElem, pagehandler)
    {
        super(config, targetElem, pagehandler);
        let w = this.config;
        this.counter = 0;
        this.subsys  = w.id;
        this.numKeys = this.config.ntkeys ? this.config.ntkeys.length : 0;

        let gstyle = pagehandler.newGridElemStyle.bind(pagehandler);

        let html = "<div class='systemstate container gridded'>";
        html +=     `<div ${gstyle([120, "row"])}>`; // 120-grid-units for title
        html +=       `<span class="title">${w.label}</span> `;
        // add spans to title div according to ntkeys (like status, etc)
        for(let i=0;i<this.numKeys;i++)
        {
            let key = this.config.ntkeys[i];
            let domid = this.ntkeyToDOMId(key);
            let label = this.ntkeyToLabel(key, this.subsys);
            // infer label from network table name
            html += `<span class='state'>${label}</span> `+
                    `<span class='strong' id='${domid}'>n/a</span> `;
        }
        html += "</div>"; // end of 120-grid-units
        if(this.config.widgets)
        {
            this.widgetsId = `${w.id}Widgets`;
            let sz = this.config.wsize ? this.config.wsize :  [800, "row"];
            let wstl = gstyle(sz);
            html += `<div id='${this.widgetsId}' ${wstl})}></div>`;
        }
        html += "</div>"; // end of systemstate
        html += "<hr />";
        targetElem.html(html);

        if(this.widgetsId)
        {
            let wtarget = document.getElementById(this.widgetsId);
            pagehandler.layoutWidgets(this.config.widgets, function(html, cb) {
                wtarget.innerHTML = html;
                cb();
            });
        }
    }

    valueChanged(key, value, isNew)
    {
        let id = this.ntkeyToDOMId(key);
        // since jquery doesn't like '/' in ids, we must avoid it
        // $("#"+id).html(value);
        let el = document.getElementById(id);
        el.innerHTML = value;
    }

    addRandomPt()
    {
        this.counter++;
        let mod = this.counter % 100;
        if(mod < this.numKeys)
        {
            let key = this.config.ntkeys[mod];
            let r = Math.floor(7 * Math.random() - .01);
            let val  = ["OK", "Fuzzy", "Hrm", "Ahem..", "Er..", "Gulp", "Nominal"][r];
            app.putValue(key, val, true);
            //this.valueChanged(key, value, true);;
        }
    }
}

Widget.AddWidgetClass("systemstate", SystemState);