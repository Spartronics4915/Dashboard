class SystemState extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        let w = this.config;
        this.counter = 0;
        this.subsys  = w.id;
        this.numKeys = this.config.ntkeys.length;

        let html = "<div class='systemstate'>";
        html += `<label>${w.label}</label>&nbsp;&nbsp;`;
        for(let i=0;i<this.numKeys;i++)
        {
            let key = this.config.ntkeys[i];
            let labelId = this.ntkeyToDOMId(key);
            // infer label from network table name
            html  += `${labelId[0]} <span class='strong' id='${labelId[1]}'>n/a</span> `;
        }
        html += "<hr />";
        html += "</div>";
        targetElem.html(html);
    }

    valueChanged(key, value, isNew)
    {
        let labelId = this.ntkeyToDOMId(key);
        $("#"+labelId[1]).html(value);
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
            app.putValue(key,  val, true);
            //this.valueChanged(key, value, true);;
        }
    }
}