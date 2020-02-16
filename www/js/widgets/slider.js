/* global $, Widget */
class SliderWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = this.config.params;
        this.targetId = targetElem.attr("id");
        targetElem.addClass("flex");
        this.controlId = `${this.config.id}Slider`;
        this.txtId = `${this.config.id}Txt`;
        let width = this.params.width;
        let min = this.params.min;
        let max = this.params.max;
        let step = this.params.step;
        if(min == undefined) min = 0;
        if(max == undefined) max = 100;
        if(step == undefined) step = 1;
        if(!width) width = "10em";
        let html = `<label>${this.config.label}</label>&nbsp;&nbsp;`;
        html += `<input type='range' min='${min}' max='${max}' step='${step}'`;
        html +=    ` id='${this.controlId}'></input>`;
        html += `<span id='${this.txtId}'>0</span>`;
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
        $("#" + this.txtId).text(value);
    }

    addRandomPt()
    {
    }
}

Widget.AddWidgetClass("slider", SliderWidget);