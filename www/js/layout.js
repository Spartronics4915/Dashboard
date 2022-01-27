/* global $ app */

"use_strict";

class Layout
{
    constructor(config)
    {
        this.config = config ? config : {};
        if(this.config.envname == undefined)
            this.config.envname = "default";
        this.pageHandlers = {};
        if(this.config.layout)
        {
            $.getJSON(this.config.layout)
                .done(this._initJSON.bind(this))
                .fail(function(jqxhr, textStatus, error) 
                {
                    var err = textStatus + ", " + error;
                    app.error("Layout Failed: " + err);
                });
        }
        else
            app.warning("Layout requires config.layout");
    }

    _initJSON(jsonObj, textStatus, jqXHR)
    {
        app.info("init layout with " + jsonObj.layoutName);
        this.layout = jsonObj;
        this.environments = this.layout.environments;
        if(this.environments != undefined)
        {
            // compose named env over default
            let namedEnv = this.environments[this.config.envname];
            if(!namedEnv)
            {
                app.warning("layout.environments is missing " +
                                this.config.envname);
            }
            this.env = Object.assign({}, this.environments.default, namedEnv);
            this.layoutBefore = this.layout;
            this.layout = this._doSubst(jqXHR.responseText, this.env);
        }
        this.season = this.layout.season;
        if(!this.season)
        {
            this.season = 
            {
                year: "2019",
                robotid: "FirstRobot",
                field: 
                {
                    xsize: 640,
                    ysize: 320,
                    xrange: [0, 640],
                    yrange: [-160, 160]
                }
            };
        }
        this.pageTemplates = this.layout.pageTemplates;
        let htmlList = [];
        for(let i=0;i<this.pageTemplates.length;i++)
        {
            let page = `tab${i}`;
            let icon = this.pageTemplates[i].icon;
			let navtext = this.pageTemplates[i].navtext;
            if(icon)
            {
                if(icon != "_none_")
                {
                    htmlList.push(`<div class='navtab' title='${navtext}'>` +
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


    _doSubst(input, map)
    {
        let newstr = input.replace(/\$\{\w+\}/g,
            function(match)
            {
                let key = match.slice(2, -1);
                let result = map[key];
                if (result === undefined)
                {
                    app.error("missing env reference: " + key);
                    return match;
                }
                else
                    return result;
            });
        return JSON.parse(newstr);
    }
}

window.Layout = Layout;
