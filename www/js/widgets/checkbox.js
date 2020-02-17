/* global $, Widget */
class CheckboxWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = this.config.params;
        targetElem.addClass("flex");
        this.targetId = targetElem.attr("id");
        this.controlId = `${this.config.id}Check`;
        let html = `<label>${this.config.label}</label> `;
        html += `<input type='checkbox' id='${this.controlId}'></input>`;
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
        $("#" + this.controlId).prop("checked", value);
    }

    addRandomPt()
    {
    }
}

Widget.AddWidgetClass("checkbox", CheckboxWidget);