/* global $ app */

"use_strict";

class Layout
{
    constructor(config)
    {
        this.config = config ? config : {};
        this.pageHandlers = {};
        if(this.config.layout)
            $.getJSON(this.config.layout)
                .done(this._initJSON.bind(this))
                .fail(function( jqxhr, textStatus, error ) {
                    var err = textStatus + ", " + error;
                    app.error("Layout Failed: " + err);
                });
        else
            app.warning("Layout requires config.layout");
    }

    _initJSON(jsonObj)
    {
        app.info("init layout with " + jsonObj.layoutName);
        this.layout = jsonObj;
        this.pageTemplates = this.layout.pageTemplates;
        let htmlList = [];
        for(let i=0;i<this.pageTemplates.length;i++)
        {
            let page = `tab${i}`;
            let icon = this.pageTemplates[i].icon;
            if(icon)
            {
                if(icon != "_none_")
                {
                    htmlList.push("<div class='navtab'>" +
                       `<a href='#${page}'>` +
                            `<span class='${icon}'></span>` +
                        "</a></div>");
                }
            }
            else
            {
                let title = this.pageTemplates[i].navtext;
                htmlList.push(`<div class="navtab"><a href="#${page}">${title}</a></div>`);
            }
            this.pageHandlers[page] = this._buildPageHandler(this.pageTemplates[i]);
        }
        $("#navlayout").replaceWith(htmlList.join(" "));
        if(this.config.onLoad)
            this.config.onLoad();
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
        $("#mainlayout").html(html);
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
