/* global $ app PageHandler */

"use_strict";

window.Layout = function(config) 
{
    this.config = config ? config : {};

    this.init = function()
    {
        if(this.config.layout)
        {
            $.getJSON(this.config.layout, this.initJSON.bind(this));
        }
        else
            app.warning("Layout requires config.layout");
    }

    this.initJSON = function(jsonObj)
    {
        this.layout = jsonObj;
        this.navTabs = this.layout.tabPane;
        let htmlList = [];
        for(let i=0;i<this.navTabs.length;i++)
        {
            let title = this.navTabs[i].title;
            let url = `#tab${i}`;
            htmlList.push(`<li class="navLink"><a href="${url}">${title}</a></li>`);
            app.setPageHandler(url, this.buildPageHandler(this.navTabs[i]));
        }
        $("#mainNav").html(htmlList.join(" "));

        // now install a pageHandler for each url (#tab[0-n])
    };

    this.buildPageHandler = function(navTab)
    {
        let config = {};
        let ph = new PageHandler(config);
        // build pagehandler based on navTab recipe
        // https://wpilib.screenstepslive.com/s/currentCS/m/shuffleboard/l/821652-displaying-data-from-your-robot
        //
        // prefer css grids over bootstrap
        // https://scrimba.com/g/gR8PTE
        //
        // widgetPane:
        //  gridSize: 64.0
        //  showGrid: true/false   
        //  hgap, vgap: 16.0
        //  tiles[]:
        //      locKey ("9,2")
        //          size: [2,2]
        //          content:
        //              _type: Graph
        //                     Number Bar, 
        //                     Number Slider, 
        //                     Simple Dial, 
        //                     Text View, 
        //                     Voltage View,
        //                     Encoder, 
        //                     Boolean Box,
        //              _source0:  nettabURL
        //              _title: "a title"
        //              .. _type-specific-params__

        let widgetPane = navTab.widgetPane;

        return ph;
    };

};
