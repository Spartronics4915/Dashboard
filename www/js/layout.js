/* global $ app */

"use_strict";

class Layout
{
    constructor(config)
    {
        this.config = config ? config : {};
        this.pageHandlers = {};
        if(this.config.layout)
            $.getJSON(this.config.layout, this._initJSON.bind(this));
        else
            app.warning("Layout requires config.layout");
    }

    _initJSON(jsonObj)
    {
        this.layout = jsonObj;
        this.pageTemplates = this.layout.pageTemplates;
        let htmlList = [];
        for(let i=0;i<this.pageTemplates.length;i++)
        {
            let title = this.pageTemplates[i].title;
            let page = `tab${i}`;
            htmlList.push(`<div class="navtab"><a href="#${page}">${title}</a></div>`);
            this.pageHandlers[page] = this._buildPageHandler(this.pageTemplates[i]);
        }
        $("#navplaceholder").replaceWith(htmlList.join(" "));
    }

    // buildContentPage: occurs on tab changes
    buildContentPage(url)
    {
        let ph = this.pageHandlers[url];
        if(!ph)
        {
            app.error("no page handler for " + url);
            this._loadHtml(`<div class="ERROR">No Page Handler for ${url}</div>`);
        }
        else
        {
            ph.buildPage(this._loadHtml.bind(this));
        }
        return ph;
    }

    _loadHtml(html, onDoneCB)
    {
        $("#layoutContents").html(html);
        if(onDoneCB)
            onDoneCB();
    }

    _buildPageHandler(pageTemplate)
    {
        let config = {};
        var ph = "PageHandler";
        if(pageTemplate && pageTemplate.pagehandler)
        {
            ph = pageTemplate.pagehandler;
            if(!window[ph])
            {
                app.warning("can't find page handler named " + ph);
                ph = "PageHandler";
            }
        }
        return new window[ph](config, pageTemplate);
    }
}

window.Layout = Layout;
