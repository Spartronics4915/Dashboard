class SystemState extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        let w = this.config;
        this.counter = 0;
        this.subsys  = w.id;
        this.numKeys = this.config.ntkeys ? this.config.ntkeys.length : 0;

        let html = "<div class='systemstate'>";
        html += `<span class='title'>${w.label}</span>`;
        for(let i=0;i<this.numKeys;i++)
        {
            let key = this.config.ntkeys[i];
            let domid = this.ntkeyToDOMId(key);
            let label = this.ntkeyToLabel(key, this.subsys);
            // infer label from network table name
            html += `${label} <span class='strong' id='${domid}'>n/a</span> `;
        }
        html += "<hr />";
        html += "</div>";
        targetElem.html(html);
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