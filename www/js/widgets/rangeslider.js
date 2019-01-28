/* global $, Widget, app */
class RangeSliderWidget extends Widget
{
    // the value for a RangeSliderWidth is a from/to tuple
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = {
            type: "double", // not the data type, but two handles!
            skin: "flat",
            min: 0,
            max: 100,
            // step: 1,
            from: 20,
            to: 50,
            width: "200px",
            grid: false,
            onStart: this.onStart.bind(this),
            onChange: this.onChange.bind(this),
            onFinish: this.onFinish.bind(this),
            onUpdate: this.onUpdate.bind(this)
        };
        this.params = Object.assign(this.params, config.params);
        this.targetId = targetElem.attr("id");
        // targetElem.addClass("flex"); breaks assumptions of js-range-slider
        this.controlId = `${this.config.id}Range`;

        let html = `<label style="width:8em">${this.config.label}</label> `;
        html += "<input type='text' class='js-range-slider' ";
        html +=     `id="${this.controlId}" value="" `;
        html += "/>";
        targetElem.html(html);

        $(`#${this.controlId}`).ionRangeSlider(this.params);
        this.rslider = $(`#${this.controlId}`).data("ionRangeSlider");
    }

    onStart(data)
    {
    }

    onChange(data)
    {
        // onChange is invoked on each drag if we invoke
        //  app.putvalue here motion gets chunky
    }

    onUpdate(data)
    {
        // onUpdate is invoked after we call update 
        // app.info(this.config.label + " onUpdate");
        app.putValue(this.config.ntkeys[0], `${data.from},${data.to}`);
    }

    onFinish(data)
    {
        // app.info(this.config.label + " onFinish");
        app.putValue(this.config.ntkeys[0], `${data.from},${data.to}`);
    }

    getIdToNTKeyMap() // @override
    {
        let m = {};
        m[this.controlId] = this.config.ntkeys[0];
        return m;
    }

    valueChanged(key, value, isNew)
    {
        // value is expected to be a comma-separated pair
        if(!Array.isArray(value))
            value = value.split(",");
        if(value.length != 2)
            app.warning("range slider expects a 'minVal,maxVal' pair, got:" + value); 
        else
        {
            this.rslider.update({
                from: value[0],
                to: value[1]
            });
        }

        //$("#" + this.controlId).val(value);
        //$("#" + this.txtId).text(value);
    }

    addRandomPt()
    {
    }
}

Widget.AddWidgetClass("rangeslider", RangeSliderWidget);
