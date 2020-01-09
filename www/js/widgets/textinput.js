/* global $, Widget */
class TextInputWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = this.config.params;
        this.targetId = targetElem.attr("id");
        this.controlId = `${this.config.id}Txt`;
        let width = "10em";
        if(this.params && this.params.width)
            width = this.params.width;
        let html = `<label>${this.config.label}</label> `;
        html += `<input type='text' style='width:${width}' id='${this.controlId}'></input>`;
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

Widget.AddWidgetClass("textinput", TextInputWidget);