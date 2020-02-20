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
        this.xrange = this.plotConfig.xaxis.max - this.plotConfig.xaxis.min + 1;
        this.yrange = this.plotConfig.yaxis.max - this.plotConfig.yaxis.min + 1;
        if(!this.plotConfig.maxlength)
        {
            this.plotConfig.maxlength = 300; // number of data points
        }
        if(!config.params.channelcount)
            config.params.channelcount = 1;

        this.reset();

        // console.log("plotting: " + this.plotConfig.id);
        // we use flot for plotting.  In their terminology we have
        // a single series for our data. Configuration options are generally
        // established during this constructor. We can, importantly, update 
        // the data on the fly.
        this.plotConfig.id = `#${this.config.id}Plot`;
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
        html +=  `<label>${this.config.label}</label>`;
        html +=  `<div id='${this.plotConfig.id.slice(1)}'`;
        html +=      `style='width:${cwidth}px;height:${cheight}px' `;
        html +=      "class='pathPlot'>";
        html +=  "</div>";
        html += "</div>";
        targetElem.html(html);
        this.plot = $.plot(this.plotConfig.id, this._getPathData(),
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
        this._addDataPts2(data.pt2list);
    }

    valueChanged(key, value, isNew)
    {                
        // We expect three numbers in string value: "x y angle"
        //  (parseFloat is builtin)
        let chan = 0;
        if(Array.isArray(this.config.ntkeys))
            chan = this.config.ntkeys.indexOf(key);
        var result;
        if(Array.isArray(value))
            result = value;
        else
            result = value.split(" ").map(parseFloat);
        this._addDataPt(result[0], result[1], result[2], chan);
    }

    reset()
    {
        this.chanData = [];
        this.nextSlot = [];
        for(let ch=0;ch < this.config.params.channelcount; ch++)
        {
            this.chanData[ch] = [];
            this.nextSlot[ch] = 0;
        }
    }

    _addDataPt(x, y, angle, chan=0)
    {
        let data = this.chanData[chan];
        let nextSlot = this.nextSlot[chan];
        if (data.length < nextSlot+1)
            data.push((0,0,0));
        data[nextSlot] = this.clamp(x, y, angle);
        nextSlot++;
        if(nextSlot === this.plotConfig.maxlength)
           nextSlot = 0;
        this.nextSlot[chan] = nextSlot;
        if(chan == 0)
        {
            this.plot.setData(this._getPathData());
            this.plot.draw();
        }
    }

    _addDataPts2(pt2list, chan=0)
    {
        let data = this.chanData[chan];
        let nextSlot = this.nextSlot[chan];
        for(let i=0;i<pt2list.length;i++)
        {
            if (data.length < nextSlot+1)
                data.push((0,0,0));
            let pt = pt2list[i];
            data[nextSlot] = this.clamp(pt[0], pt[1], 0);
            nextSlot++;
            if(nextSlot === this.plotConfig.maxlength)
               nextSlot = 0;
        }
        this.nextSlot[chan] = nextSlot;
        this.plot.setData(this._getPathData());
        this.plot.draw();
    }

    addRandomPt(chan=0) 
    {
        let data = this.chanData[chan];
        let nextSlot = this.nextSlot[chan];
        if(data.length == 0) 
        {
            this._addDataPt(this.plotConfig.xaxis.min + this.xrange/2, 
                           this.plotConfig.yaxis.min + this.yrange/2, 
                           0, chan);
        }
        else
        {
            let lastSlot = (this.plotConfig.maxlength + nextSlot - 1) % 
                            this.plotConfig.maxlength;
            let lastPt = data[lastSlot];
            this._addDataPt(lastPt[0] + 25*(Math.random()-.5), 
                          lastPt[1]+ 25*(Math.random()-.5), 0, chan);
        }
        if(chan==0)
        {
            for(let ch=1;ch < this.config.params.channelcount; ch++)
                this.addRandomPt(ch);
        }
    }

    /**
     * returns an array of 1 or more arrays of data
     */
    _getPathData() 
    {
        var result = [];
        for(let chan=0;chan<this.config.params.channelcount;chan++)
        {
            let data = this.chanData[chan];
            let chanres = [];
            let nextSlot = this.nextSlot[chan];

            // oldest data is at this.nextSlot, we want to run oldest to newest
            // this is only true after we've filled our array
            if(data.length < this.plotConfig.maxlength)
            {
                for(let i=0; i<data.length; i++)
                    chanres.push(data[i]);
            }
            else
            for(let i=0; i<data.length; i++)
            {
                var j = (i + nextSlot) % this.plotConfig.maxlength;
                chanres.push(data[j]);
            }
            result.push(chanres);
        }
        return result;
    }

    clamp(x, y, angle)
    {
        if(x < this.plotConfig.xaxis.min)
            x = this.plotConfig.xaxis.min;
        else
        if(x > this.plotConfig.xaxis.max)
            x = this.plotConfig.xaxis.max;
        if(y < this.plotConfig.yaxis.min)
            y = this.plotConfig.yaxis.min;
        else
        if(y > this.plotConfig.yaxis.max)
            y = this.plotConfig.yaxis.max;
        return [x, y]; // for now we drop angle
    }
}

Widget.AddWidgetClass("pathplot", PathPlot);