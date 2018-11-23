class SystemState extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        this.counter = 0;

        let html = "<div class='systemstate'>";
        let w = this.config;
        html += `<label>${w.label}</label>&nbsp;&nbsp;`;
        html += `STATE <span class='data' id='${w.id}State'>n/a</span>`;
        html += "&nbsp;";
        html += `STATUS <span class='data' id='${w.id}Status'>n/a</span>`;
        html += "<hr />";
        html += "</div>";
        targetElem.html(html);
    }

    valueChanged(key, value, isNew)
    {
        let w = this.config;
        if(key.indexOf("/State") != -1)
        {
            $('#{w.id}State').html(value);
        }
        else
        if(key.indexOf("/Status") != -1)
        {
            $('#{w.id}Status').html(value);
        }
        else
            app.warning("unexpected ntkey " + key);
    }

    addRandomPt()
    {
        this.counter++;
        if(this.counter % 50 == 0)
            $(`#${this.config.id}Status`).html((this.counter / 50).toFixed(2));
        if(this.counter % 1000 == 0)
            $(`#${this.config.id}State`).html("OK");
        else
        if(this.counter %  500  == 0)
            $(`#${this.config.id}State`).html("hmm");
    }

}