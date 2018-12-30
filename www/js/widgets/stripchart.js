/* global $ */
// StripChart requires jquery.flot plot package
class StripChart extends Widget
{
    constructor(config, targetElem) 
    {
        super(config, targetElem);
        this.plotConfig = this.config.params.plot;
        this.plotConfig.id = `#${this.config.id}Plot`;
        if(this.config.label)
        {
            this.txtConfig = {};
            this.txtConfig.id = `${this.config.id}Txt`;
        }
        else
            this.txtConfig = null;
        if (!this.plotConfig.series)
            this.plotConfig.series = {};
        if(!this.plotConfig.series.color)
            this.plotConfig.series.color = "rgb(255, 255, 10)";
        if(!this.plotConfig.series.shadowSize)
            this.plotConfig.series.shadowSize = 0;
        this.plotConfig.xaxis = {show: false}; // always time
        if(this.plotConfig.maxlength == undefined)
            this.plotConfig.maxlength = 300; // XXX:
        if(this.plotConfig.channelcount == undefined)
            this.plotConfig.channelcount = 1;
        this.data = [];
        if(this.plotConfig.colors == undefined)
        {
            this.plotConfig.colors = [];
            for(let i=0;i<this.plotConfig.channelcount;i++)
                this.plotConfig.colors[i] = this.plotConfig.series.color;
        }
        if(this.plotConfig.widths == undefined)
        {
            this.plotConfig.widths = [];
            for(let i=0;i<this.plotConfig.channelcount;i++)
                this.plotConfig.widths[i] = 2;
        }
        this.yrange = this.plotConfig.yaxis.max - this.plotConfig.yaxis.min + 1;
        for(let i=0;i<this.plotConfig.channelcount;i++)
        {
            this.data[i] = new Array(this.plotConfig.maxlength);
            if(this.plotConfig.fillvalue != undefined)
                this.data[i].fill(this.plotConfig.fillvalue);
            else
                this.data[i].fill(this.plotConfig.yaxis.min + this.yrange/2);
        }
        this.nextSlot = 0;
        let cwidth = 326;
        let cheight = 162;
        if(this.config.size)
        {
            cwidth = this.config.size[0];
            cheight = this.config.size[1];
            if(this.config.label)
            {
                cwidth -= 20;
                cheight -= 20;
            }
        }
        let html = "<div class='plotContainer'>";
        if(this.config.label)
            html +=   `<label>${this.config.label}</label> `;
        if(this.config.txtConfig)
        {
            html +=   `<label id=${this.txtConfig.id} `;
            html +=        `style='display:inline-block;width:4em;color:${this.plotConfig.colors[0]};text-align:right'>`;
            html +=    "0 </label>";
        }
        html +=   `<div id='${this.plotConfig.id.slice(1)}' `; // eliminate #
        html +=      `style='width:${cwidth}px;height:${cheight}px' `;
        html +=      "class='stripChart'>";
        html +=    "</div>";
        html += "</div>";
        targetElem.html(html);
        // app.logMsg("plotting: " + this.config.id);
        this.plot = $.plot(this.plotConfig.id, this.getStripData(), 
                            this.plotConfig);
    }

    valueChanged(key,  vals, isnew)
    {
        // currently we only support a single key, so no need to check it.
        if(Array.isArray(vals))
            this.addDataPts(vals);
        else
        {
            if(this.plotConfig.channelcount > 1)
            {
                let nvals = vals.split(" ").map(parseFloat);
                app.notice("stripchart: " + nvals);
                this.addDataPt(nvals);
            }
            else
                this.addDataPt(vals);
        }
    }

    addDataPt(value, chan)
    {
        if(chan == undefined)
            chan = 0;
        this.data[chan][this.nextSlot] = value;
        this.nextSlot++;
        if(this.nextSlot === this.plotConfig.maxlength)
            this.nextSlot = 0;
        this.plot.setData(this.getStripData());
        this.plot.draw();
        if(this.config.txtConfig)
        {
            $("#"+this.txtConfig.id).html(value.toFixed(2));
        }
    }

    addDataPts(values)
    {
        for(let i=0;i<this.data.length;i++)
            this.data[i][this.nextSlot] = values[i];
        this.nextSlot++;
        if(this.nextSlot === this.config.maxlength)
            this.nextSlot = 0;
        this.plot.setData(this.getStripData());
        this.plot.draw();
        if(this.config.txtConfig)
        {
            $("#"+this.txtConfig.id).html(values[0].toFixed(2));
        }
    }

    // changes the data at the last slot
    changeDataPts(values)
    {
        let slot = this.nextSlot - 1;
        if(slot == -1)
            slot = this.plotConfig.maxlength - 1;
        for(let i=0;i<this.data.length;i++)
            this.data[i][slot] = values[i];
        this.plot.setData(this.getStripData());
        this.plot.draw();
    }

    getStripData()
    {
        var result = []; // array of objects, one per channel
        for(let i=0;i<this.data.length;i++) // ie number of channels
        {
            result.push({
                color: this.plotConfig.colors[i],
                data: [],
                lines: {
                    lineWidth: this.plotConfig.widths[i],
                },
            });
            let d = result[i].data;
            for(let j=0; j<this.data[i].length; j++)
            {
                var k = (j + this.nextSlot) % this.plotConfig.maxlength;
                d.push([j, this.data[i][k]]);
            }
        }
        return result;
    }

    addRandomPt()
    {
        var lastSlot = ( this.plotConfig.maxlength + this.nextSlot - 1) %
                         this.plotConfig.maxlength;
        let pts = [];
        for(let i=0;i<this.data.length;i++) // ie num channels
        {
            var lastVal = this.data[i][lastSlot];
            pts.push(this.clamp(lastVal + .1*this.yrange*(Math.random()-.5)));
        }
        this.addDataPts(pts);
    }

    clamp(y)
    {
        if(y < this.plotConfig.yaxis.min)
            y = this.plotConfig.yaxis.min;
        else
        if(y > this.plotConfig.yaxis.max)
            y = this.plotConfig.yaxis.max;
        return y;
    }

    getRandomData()
    {
        if(this.randomData.length > 0)
        {
            this.randomData = this.randomData.slice(1);
        }
        while(this.randomData.length < 300)
        {
            var prev = this.randomData.length > 0 ?
                        this.randomData[this.randomData.length-1] : 50;
            var y = prev + Math.random() * 10 - 5;
            if(y < 0)
            {
                y = 0;
            }
            else
            if(y > 100)
            {
                y = 100;
            }
            this.randomData.push(y);
        }
        // Zip the generated y values with the x values
        var res = [];
        for(var i=0; i<this.randomData.length; i++)
        {
            res.push([i, this.randomData[i]]);
        }
        return res;
    }
}

Widget.AddWidgetClass("stripchart", StripChart);
