/* global $ app */

"use_strict";

window.PageHandler = function(config) 
{
    this.config = config;
    this.netTabHandlers = {};

    this.init = function()
    {
    };

    this.setNetTabHandler = function(key, handler)
    {
        if(this.netTabHandlers[key])
            app.warning("nettab collision for " + key);
        this.netTabHandlers[key] = handler;
    };

    this.onPageLoaded = function(targetElem, html)
    {
        // install callbacks for standard ui elements
    };

    this.onNetTabChange = function(key, value, isNew)
    {
        let f = this.netTabHandlers[key];
        if(f == undefined) return;
        f(value, isNew);
    };

};