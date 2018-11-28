/* global $, Widget */
class NumberWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = this.config.params;
        this.targetId = targetElem.attr("id");
        targetElem.addClass("flex");
        this.controlId = `${this.config.id}Slider`;
        this.txtId = `${this.config.id}Txt`;
        if(!this.params)
            this.params = {};
        if(!this.params.width)
            this.params.width = "5em";
        if(!this.params.min)
            this.params.min = 0;
        if(!this.params.max)
            this.params.max = 100;
        if(!this.params.step)
            this.params.step = 1;
        let width = this.params.width;
        let min = this.params.min;
        let max = this.params.max;
        let step = this.params.step;
        let html = `<label>${this.config.label}</label> `;
        html += "<input type='number' ";
        html +=     `min='${min}' max='${max}' step='${step}' `;
        html +=     `style='width:${width}px' `;
        html +=     `id='${this.controlId}'>`;
        html +=  "</input>";
        targetElem.html(html);
    }

    getIdToNTKeyMap() // @override
    {
        let m = {};
        m[this.controlId] = this.config.ntkeys[0];
        return m;
    }

    valueChanged(key, value, isNew)
    {
        $("#" + this.controlId).val(value);
    }

    addRandomPt()
    {
    }
}

Widget.AddWidgetClass("numberinput", NumberWidget);