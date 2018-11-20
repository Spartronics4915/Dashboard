/* global $ */
// StripChart requires jquery.flot plot package
window.StripChart = function(config) {
    this.config = config;
    if (!this.config.series) {
        this.config.series = {};
    }
    if(!this.config.series.color)
        this.config.series.color = "rgb(255, 255, 10)";
    if(!this.config.series.shadowSize)
        this.config.series.shadowSize = 0;
    this.config.xaxis = {show: false}; // always time
    if(this.config.maxlength == undefined)
        this.config.maxlength = 300; // XXX:
    if(this.config.channelcount == undefined)
        this.config.channelcount = 1;
    this.data = [];
    if(this.config.colors == undefined)
    {
        this.config.colors = [];
        for(let i=0;i<this.config.channelcount;i++)
            this.config.colors[i] = this.config.series.color;
    }
    if(this.config.widths == undefined)
    {
        this.config.widths = [];
        for(let i=0;i<this.config.channelcount;i++)
            this.config.widths[i] = 2;
    }
    this.height = this.config.yaxis.max - this.config.yaxis.min + 1;
    for(let i=0;i<this.config.channelcount;i++)
    {
        this.data[i] = new Array(this.config.maxlength);
        if(this.config.fillvalue != undefined)
            this.data[i].fill(this.config.fillvalue);
        else
            this.data[i].fill(this.height / 2);
    }
    this.nextSlot = 0;

    this.init = function() // called at end of function/Class definition
    {
        // app.logMsg("plotting: " + this.config.id);
        this.plot = $.plot(this.config.id, this.getStripData(), this.config);
    };

    this.addDataPt = function(value, chan)
    {
        if(chan == undefined)
            chan = 0;
        this.data[chan][this.nextSlot] = value;
        this.nextSlot++;
        if(this.nextSlot === this.config.maxlength)
            this.nextSlot = 0;
        this.plot.setData(this.getStripData());
        this.plot.draw();
    };

    this.addDataPts = function(values)
    {
        for(let i=0;i<this.data.length;i++)
            this.data[i][this.nextSlot] = values[i];
        this.nextSlot++;
        if(this.nextSlot === this.config.maxlength)
            this.nextSlot = 0;
        this.plot.setData(this.getStripData());
        this.plot.draw();
    },

    // changes the data at the last slot
    this.changeDataPts = function(values)
    {
        let slot = this.nextSlot - 1;
        if(slot == -1)
            slot = this.config.maxlength - 1;
        for(let i=0;i<this.data.length;i++)
            this.data[i][slot] = values[i];
        this.plot.setData(this.getStripData());
        this.plot.draw();
    },

    this.getStripData = function()
    {
        var result = []; // array of objects, one per channel
        for(let i=0;i<this.data.length;i++) // ie number of channels
        {
            result.push({
                color: this.config.colors[i],
                data: [],
                lines: {
                    lineWidth: this.config.widths[i],
                },
            });
            let d = result[i].data;
            for(let j=0; j<this.data[i].length; j++)
            {
                var k = (j + this.nextSlot) % this.config.maxlength;
                d.push([j, this.data[i][k]]);
            }
        }
        return result;
    };

    this.addRandomPt = function()
    {
        var lastSlot = (this.config.maxlength + this.nextSlot - 1) %
                        this.config.maxlength;
        let pts = [];
        for(let i=0;i<this.data.length;i++) // ie num channels
        {
            var lastVal = this.data[i][lastSlot];
            pts.push(this.clamp(lastVal + this.height*.1*(Math.random()-.5)));
        }
        this.addDataPts(pts);
    };

    this.clamp = function(y)
    {
        if(y < 0)
            y = 0;
        else
        if(y > this.height)
            y = this.height;
        return y;
    };

    this.getRandomData = function()
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
    };

    this.init();
};
