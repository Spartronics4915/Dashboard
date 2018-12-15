/* global app Widget $ */

// Our job is to collect points in a circular array and to
// update the flot-based plot (see http://www.flotcharts.org)
//
// We assume the points are expressed in inchess on a field
// with dimensions 652x324. 
//
// network table values:
//  We expect to receive a triple from the network tables and
//  currently drop the third number (angle) and only plot the
//  position.
//
// websub values:
//  We currently support an object with a field, pt2list
//  
class PathPlot extends Widget
{
    constructor(config, targetElem)
    {
        super(config, targetElem);
        this.plotConfig = config.params.plot;
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

    onWebSubMsg(cls, data)
    {
        if(!data.pt2list)
        {
            app.error(this.config.id + 
                    " invalid websubmsg payload (missing p2list)");
            return;
        }
        this.addDataPts2(data.pt2list);
    }

    valueChanged(key, value, isNew)
    {                
        // We expect three numbers in string value: "x y angle"
        //  (parseFloat is builtin)
        var result = value.split(" ").map(parseFloat);
        this.addDataPt(result[0], result[1], result[2]);
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

    addDataPts2(pt2list)
    {
        for(let i=0;i<pt2list.length;i++)
        {
            if (this.data.length < (this.nextSlot+1))
                this.data.push((0,0,0));
            let pt = pt2list[i];
            this.data[this.nextSlot] = this.clamp(pt[0], pt[1], 0);
            this.nextSlot++;
            if(this.nextSlot === this.plotConfig.maxlength)
                this.nextSlot = 0;
        }
        this.plot.setData([this.getPathData()]);
        this.plot.draw();
    }

    addRandomPt() 
    {
        if(this.config.websubkeys) return; // expecting data from websub
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
            for(let i=0; i<this.data.length; i++)
                res.push(this.data[i]);
        }
        else
        for(let i=0; i<this.data.length; i++)
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

Widget.AddWidgetClass("pathplot", PathPlot);