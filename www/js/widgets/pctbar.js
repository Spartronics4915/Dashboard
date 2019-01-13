/* global $, Widget, CanvasWidget */
class PctBarWidget extends CanvasWidget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = 
        {
            labelStyle:
            {
                color: "#aa8",
                font: "20px Fixed",
                formatter: null
            },
            barStyle:
            {
                range: [0, 100],
                radius: 5,
                orient: "horizontal",
                fill: "#229",
                stroke: "#000",
                fillSelector: null
            }
        };
        Object.assign(this.params.labelStyle, this.config.params.labelStyle);
        Object.assign(this.params.barStyle, this.config.params.barStyle);
        this.targetId = targetElem.attr("id");
        this.controlId = `${this.config.id}Canvas`;
        this.drange = this.params.barStyle.range[1] - this.params.barStyle.range[0];
        this.value  = this.params.barStyle.range[0] + .9 * this.drange;
        let size = this.config.size;
        let html = "<canvas" +
                   ` style='width:${size[0]}px;height:${size[1]}px'`+
                   ` width='${size[0]}' height='${size[1]}'` +
                   ` id='${this.controlId}'></canvas>`;
        targetElem.html(html);
        this.canvasEl = document.getElementById(this.controlId);
        this.canvasCtx = this.canvasEl.getContext("2d");
    }

    getIdToNTKeyMap() // @override
    {
        let m = {};
        m[this.controlId] = this.config.ntkeys[0];
        return m;
    }

    clamp(v, min, max)
    {
        if(v < min) return min;
        if(v > max) return max;
        return v;
    }

    valueChanged(key, value, isNew)
    {
        this.value = value;
        this.canvasCtx.fillStyle = "black";
        this.roundRect(this.canvasCtx, 
                    0, 0, this.config.size[0], this.config.size[1],
                    this.params.barStyle.radius, true, true);
        let org = [0, 0];
        let sz = [0,0];
        let pct = (value - this.params.barStyle.range[0]) / this.drange;
        pct = this.clamp(pct, 0, 1);
        if(this.params.barStyle.orient == "horizontal")
        {
            sz[0] = Math.round(pct * this.config.size[0]);
            sz[1] = this.config.size[1];
        }
        else
        {
            sz[0] = this.config.size[0];
            sz[1] = Math.round(pct * this.config.size[1]);
        }
        this.canvasCtx.strokeStyle = this.params.barStyle.stroke;
        this.canvasCtx.fillStyle = this.params.barStyle.fill;
        if(this.params.barStyle.fillSelector)
        {
            this.canvasCtx.fillStyle = this.params.barStyle.fillSelector(this.value);
        }
        this.roundRect(this.canvasCtx, org[0], org[1], sz[0], sz[1], 
                    this.params.barStyle.radius, true, true);
        if(this.params.labelStyle)
        {
            let txt = this.value;
            if(this.params.labelStyle.formatter)
                txt = this.params.labelStyle.formatter(this.value);
            let offset = 5;
            this.canvasCtx.fillStyle = this.params.labelStyle.fill;
            this.canvasCtx.font = this.params.labelStyle.font;
            this.canvasCtx.fillText(txt, offset, this.config.size[1]-offset);
        }
    }

    addRandomPt()
    {
        let newval = this.value + (.01 * this.drange * (Math.random()-.5));
        newval = this.clamp(newval, 
                            this.params.barStyle.range[0], 
                            this.params.barStyle.range[1]);
        this.valueChanged("",  newval, true);
    }
}

Widget.AddWidgetClass("pctbar", PctBarWidget);
