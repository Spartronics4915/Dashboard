(function(global) {
var PathPlot = function(config) {
    // Our job is to collect points in a circular array and to
    // update the flot-based plot (see http://www.flotcharts.org)
    //
    // We assume the points are expressed in inchess on a field
    // with dimensions 652x324
    this.config = config;
    this.width = this.config.xaxis.max - this.config.xaxis.min + 1;
    this.height = this.config.yaxis.max - this.config.yaxis.min + 1;

    if(!this.config.maxlength)
    {
        this.config.maxlength = 300; // number of data points
    }
    this.data = [];
    this.nextSlot = 0;

    this.addDataPt = function(x, y, angle) {
        if (this.data.length < (this.nextSlot+1))
        {
            this.data.push((0,0,0));
        }
        this.data[this.nextSlot] = this.clamp(x, y, angle);
        this.nextSlot++;
        if(this.nextSlot === this.config.maxlength) {
            this.nextSlot = 0;
        }
        this.plot.setData([this.getPathData()]);
        this.plot.draw();
    };

    this.clearPts = function() {
      this.data = [];
    }

    this.addRandomPt = function() {
        if (this.data.length == 0)
        {
            this.addDataPt(this.width/2, this.height/2, 0);
        }
        else
        {
            lastSlot = (this.config.maxlength + this.nextSlot - 1) %
                            this.config.maxlength;
            lastPt = this.data[lastSlot];
            this.addDataPt(lastPt[0] + 25*(Math.random()-.5),
                          lastPt[1]+ 25*(Math.random()-.5), 0);
        }
    };

    this.getPathData = function() {
        var res = [];
        // oldest data is at this.nextSlot, we want to run oldest to newest
        // this is only true after we've filled our array
        if(this.data.length < this.config.maxlength)
        {
            for(var i=0; i<this.data.length; i++)
            {
                res.push(this.data[i]);
            }
        }
        else
        for(var i=0; i<this.data.length; i++)
        {
            var j = (i + this.nextSlot) % this.config.maxlength;
            res.push(this.data[j]);
        }
        return res;
    };

    this.clamp = function(x, y, angle) {
        if(x < 0)
            x = 0;
        else
        if(x > this.width)
            x = this.width;
        if(y < 0)
            y = 0;
        else
        if(y > this.height)
            y = this.height;
        return [x, y]; // for now we drop angle
    };

    // console.log("plotting: " + this.config.id);
    // we use flot for plotting.  In their terminology we have
    // a single series for our data. Configuration options are generally
    // established during this constructor. We can, importantly, update
    // the data on the fly.
    this.plot = $.plot(this.config.id, [this.getPathData()], this.config);
};

global.PathPlot = PathPlot;

})(window);
