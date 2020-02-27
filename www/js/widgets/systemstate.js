/* global app Widget */

class SystemState extends Widget
{
    constructor(config, targetElem, pagehandler)
    {
        super(config, targetElem, pagehandler);
        targetElem.addClass("systemstate");

        let w = this.config;
        this.counter = 0;
        this.subsys  = w.id;
        this.numKeys = this.config.ntkeys ? this.config.ntkeys.length : 0;
        let gstyle = pagehandler.getGridStyler();

        /* first column of this row is the title and associated (text) keys */
        let html = `<span class="title">${w.label}</span> `;
        // add spans to col1 div according to ntkeys (like status, etc)
        let separator = this.config.separator || " ";
        for(let i=0;i<this.numKeys;i++)
        {
            let key = this.config.ntkeys[i];
            let domid = this.ntkeyToDOMId(key);
            let label = this.ntkeyToLabel(key, this.subsys);
            // infer label from network table name
            html += `<span class='state'>${label}</span> `+
                    `<span class='strong' id='${domid}'>n/a</span>${separator}`;
        }
        if(this.config.widgets)
        {
            // lets add widgets as siblings rather then children so we
            // don't enter recursive-grid hell.
            targetElem.html(html);
            pagehandler.layoutWidgets(this.config.widgets, (whtml, cb) => 
            {
                let rowsz = gstyle(["fill", 1]);
                let hr = `<div ${rowsz}><hr /></div>`;
                let html = `${whtml} ${hr}`;
                // targetElem is a jquery list
                targetElem[0].insertAdjacentHTML("afterend", html);
                cb();
            }, "systemstate");
        }
        else
        {
            html += "<hr />";
            targetElem.html(html);
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