/* global app */

// Our job is to collect points in a circular array and to
// update the flot-based plot (see http://www.flotcharts.org)
//
// We assume the points are expressed in inchess on a field
// with dimensions 652x324
class PathPlot extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        this.plotConfig = config.params;
        this.width = this.plotConfig.xaxis.max - this.plotConfig.xaxis.min + 1;
        this.height = this.plotConfig.yaxis.max - this.plotConfig.yaxis.min + 1;
        if(!this.plotConfig.maxlength)
        {
            this.plotConfig.maxlength = 300; // number of data points
        }
        this.data = [];
        this.nextSlot = 0;

        // console.log("plotting: " + this.plotConfig.id);
        // we use flot for plotting.  In their terminology we have
        // a single series for our data. Configuration options are generally
        // established during this constructor. We can, importantly, update 
        // the data on the fly.
        this.plotConfig.id = `#${this.config.id}Plot`;
        let html = "<div class='plotContainer'>";
        html +=  `<label>${this.config.label}</label>`;
        html +=  `<div id='${this.plotConfig.id.slice(1)}'`;
        html +=      "style='width:326px;height:162px' ";
        html +=      "class='pathPlot'>";
        html +=  "</div>";
        html += "</div>";
        targetElem.html(html);
        this.plot = $.plot(this.plotConfig.id, [this.getPathData()], 
                           this.plotConfig);
    }

    addDataPt(x, y, angle)
    {
        if (this.data.length < (this.nextSlot+1))
            this.data.push((0,0,0));
        this.data[this.nextSlot] = this.clamp(x, y, angle);
        this.nextSlot++;
        if(this.nextSlot === this.plotConfig.maxlength)
            this.nextSlot = 0;
        this.plot.setData([this.getPathData()]);
        this.plot.draw();
    }

    addRandomPt() 
    {
        if(this.data.length == 0) 
        {
            this.addDataPt(this.width/2, this.height/2, 0);
        }
        else
        {
            let lastSlot = (this.plotConfig.maxlength + this.nextSlot - 1) % 
                            this.plotConfig.maxlength;
            let lastPt = this.data[lastSlot];
            this.addDataPt(lastPt[0] + 25*(Math.random()-.5), 
                          lastPt[1]+ 25*(Math.random()-.5), 0);
        }
    }

    getPathData() 
    {
        var res = [];
        // oldest data is at this.nextSlot, we want to run oldest to newest
        // this is only true after we've filled our array
        if(this.data.length < this.plotConfig.maxlength)
        {
            for(var i=0; i<this.data.length; i++)
                res.push(this.data[i]);
        }
        else
        for(var i=0; i<this.data.length; i++)
        {
            var j = (i + this.nextSlot) % this.plotConfig.maxlength;
            res.push(this.data[j]);
        }
        return res;
    }

    clamp(x, y, angle)
    {
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
    }
}

window.PathPlot = PathPlot;