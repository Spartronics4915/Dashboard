(function(global) {
var StripChart = function(config) {
    this.config = config;
    if (!this.config.series) {
        this.config.series = {};
    }
    this.config.series.color = "rgb(255, 255, 10)";
    this.config.series.shadowSize = 0;
    this.config.xaxis = {show: false};
    if(!this.config.maxlength)
    {
        this.config.maxlength = 300; // XXX:
    }
    this.data = new Array(this.config.maxlength);
    this.height = this.config.yaxis.max - this.config.yaxis.min + 1;
    this.data.fill(this.height / 2);
    this.nextSlot = 0;

    this.addDataPt = function(value) {
        this.data[this.nextSlot] = value;
        this.nextSlot++;
        if(this.nextSlot === this.config.maxlength) {
            this.nextSlot = 0;
        }
        this.plot.setData([this.getStripData()]);
        this.plot.draw();
    };

    this.getStripData = function() {
        var res = [];
        // oldest data is at this.nextSlot, we want to run oldest to newest
        for(var i=0; i<this.data.length; i++)
        {
            var j = (i + this.nextSlot) % this.config.maxlength;
            res.push([i, this.data[j]]);
        }
        return res;
    };

    this.addRandomPt = function() {
        if (this.data.length == 0) 
            this.addDataPt(this.height/2);
        else
        {
            lastSlot = (this.config.maxlength + this.nextSlot - 1) % 
                            this.config.maxlength;
            lastVal = this.data[lastSlot];
            var rval = lastVal + this.height*.1*(Math.random()-.5);
            this.addDataPt(this.clamp(rval));
        }
    };

    this.clamp = function(y) {
        if(y < 0)
            y = 0;
        else
        if(y > this.height)
            y = this.height;
        return y;
    };

    this.getRandomData = function() {
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
    // app.logMsg("plotting: " + this.config.id);
    this.plot = $.plot(this.config.id, [this.getStripData()], this.config);
};

global.StripChart = StripChart;

})(window);
