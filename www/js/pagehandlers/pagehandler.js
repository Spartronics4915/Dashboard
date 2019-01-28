/* global $ app SelectorWidget Widget */

class PageHandler
{
    constructor(config, pageTemplate)
    {
        this.config = config;
        this.pageTemplate = pageTemplate;
        this.ntkeyMap = {}; // maps to widget
        this.websubMap = {}; // maps to widget
        this.idToNTKeyMap = {}; // maps widget id to ntkey
    }

    // buildPage: return html representation of tab contents.  For
    //  deferred html, returned html elements must contain div landing
    //  sites.  
    // Assumptions on this.pageTemplate:
    //     .widgets[] is an array of page contents
    //          .size is the size of a title as [cols,rows]
    //              where entries can be numeric or a string, "fill"
    //          .id is the unique reference to the title useful for async
    //              loading.
    //          .type is the widget type
    //              html - a generic html template rep for a widget
    //              slider -
    //              plot -
    //          .ntkey is the optional network table entrylist 
    //          .params are widget-type-specific parameters
    //              html: url
    //
    buildPage(loadHtmlCB)
    {
        this.ntkeyMap = {}; // reset on each page load
        this.idToNTKeyMap = {};
        if(this.pageTemplate.widgets)
        {
            let htmllist = [];
            // first build up html (and load it)
            for(let i=0;i<this.pageTemplate.widgets.length;i++)
            {
                let w = this.pageTemplate.widgets[i];
                let gridsize = 12; // 10x10 with gap of 2
                let sz = w.size;
                if(!sz) sz = [100, 100];
                let style = `<div id='${w.id}' style='`;
                if(sz[0] == "fill")
                    style += "grid-column:1/-1;";
                else
                {
                    let cols = Math.round(sz[0]/gridsize);
                    style += `grid-column:span ${cols};`;
                }

                if(sz[1] == "fill")
                    style += "grid-row:1/-1;";
                else
                {
                    let rows;
                    if(sz[1] == "row")
                        rows = 3;
                    else
                        rows = Math.round(sz[1]/gridsize);
                    style += `grid-row: span ${rows}; min-height:${rows*gridsize}px`; 
                }
                style += "'></div>";
                htmllist.push(style);
            }
            app.debug("pagegrid " + htmllist.join(""));
            loadHtmlCB(htmllist.join(""), function() 
            {
                // we'd like a single callback after all the dust associated
                // with loading widgets settles.   
                this.numWidgetsToLoad = this.pageTemplate.widgets.length;
                for(let i=0;i<this.pageTemplate.widgets.length;i++)
                {
                    let w = this.pageTemplate.widgets[i];
                    if(w.ntkeys)
                        this.setNetTabHandler(w.ntkeys, w);
                    if(w.websubkeys)
                        this.setWebSubHandler(w.websubkeys, w);
                    if(w.type == "html")
                    {
                        let targetElem = $(`#${w.id}`);
                        var fileref = w.params.url;
                        app.sendGetRequest(fileref, function(html) {
                            targetElem.html(html);
                            this._widgetLoaded();
                        }.bind(this));
                    }
                    else
                    {
                        let targetElem = $(`#${w.id}`);
                        w.widget = Widget.BuildWidgetByName(w.type, 
                                                        w, targetElem, this);
                        if(!w.widget)
                            app.warning("unimplemented widget type " + w.type);
                        else
                        {
                            this.setNetTabHandler(w.widget.getHiddenNTKeys(), w);
                            this.appendIdToNTKeyMap(w.widget.getIdToNTKeyMap());
                            this._widgetLoaded();
                        }
                    }
                }
            }.bind(this));
        }
    }

    cleanup()
    {
        for(let i=0;i<this.pageTemplate.widgets.length;i++)
        {
            let w = this.pageTemplate.widgets[i].widget;
            if(w)
            {
                if(w.config.websubkeys && app.webSubConnected)
                    continue;
                w.cleanup();
            }
        }
    }

    _widgetLoaded()
    {
        this.numWidgetsToLoad--;
        if(this.numWidgetsToLoad == 0)
        {
            // subclasses may wish to install handlers fork widgets after
            // loading.
            this.pageLoaded(); // overridden by subclasses
        }
    }

    appendIdToNTKeyMap(m)
    {
        if(!m) return;
        let keys = Object.keys(m);
        if(keys.length == 0) return;
        for(let k of keys)
        {
            if(this.idToNTKeyMap[k])
                app.warning("idToNTKeyMap collision for " + k);
            this.idToNTKeyMap[k] = m[k];
        }
    }

    setWebSubHandler(keys, handler)
    {
        if(!keys) return;
        if(!Array.isArray(keys)) // handler may listen to multiple keys
            keys = [keys];
        for(let j=0;j<keys.length;j++)
        {
            let key = keys[j];
            if(this.websubMap[key])
                app.warning("websub collision for " + key);
            this.websubMap[key] = handler;
        }
    }

    setNetTabHandler(keys, handler)
    {
        if(!keys) return;
        if(!Array.isArray(keys)) // handler may listen to multiple keys
            keys = [keys];
        for(let j=0;j<keys.length;j++)
        {
            let key = keys[j];
            if(this.ntkeyMap[key])
            {
                this.ntkeyMap[key].push(handler);
            }
            else
                this.ntkeyMap[key] = [handler];
        }
    }

    pageLoaded() // may be overridden by subclasses
    {
        let self = this;

        SelectorWidget.installSelectorSupport();

        // String support ----------------------------------------------
        $("input[type=text]:not(.js-range-slider)").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToNTKeyMap[id];
            if(!ntkey)
                app.warning("unknown entry " + id);
            else
            {
                var value = $(this).val();
                app.putValue(ntkey, value);
            }
        });

        // Number support ----------------------------------------------
        $("input[type=number]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToNTKeyMap[id];
            if(!ntkey)
                app.warning("unknown number " + id);
            else
            {
                var value = $(this).val();
                app.putValue(ntkey, Number(value));
            }
        });

        // Slider support ----------------------------------------------
        // slider id mapping must be present in idToNTKeyMap map above
        $("input[type=range]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToNTKeyMap[id];
            if(!ntkey)
                app.warning("unknown slider " + id);
            else
            {
                var value = $(this).val();
                app.info("slider " + id + ": " + Number(value));
                app.putValue(ntkey, Number(value));
            }
        });

        // Range support -----------------------------------------------
        // installed in widget

        // checkbox support --------------------------------------------
        $("input[type=checkbox]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToNTKeyMap[id];
            if(!ntkey)
                app.warning("unknown checkbox " + id);
            else
            {
                var value = $(this).prop("checked");
                // app.logMsg("checkbox " + id + ": " + value);
                app.putValue(ntkey, value);
            }
        });
    }

    onWebSubMsg(cls, data)
    {
        let hh = this.websubMap[cls];
        if(!hh) return;
        let w = hh.widget;
        if(!w) return;
        w.onWebSubMsg(cls, data);
    }

    onNetTabChange(key, value, isNew)
    {
        let hlist = this.ntkeyMap[key];
        if(!hlist) return;
        if(!Array.isArray(hlist))
            hlist = [hlist];

        for(let i=0;i<hlist.length;i++)
        {
            let hh = hlist[i];
            let w = hh.widget;
            if(!w) return;
            if(!hh.ntkeyRefs)
                w.valueChanged(key, value, isNew);
            else
            {
                let vals = [value];
                if(Array.isArray(hh.ntkeyRefs))
                {
                    for(let i=0;i<hh.ntkeyRefs.length;i++)
                        vals.push(app.getValue(hh.ntkeyRefs[i]));
                }
                else
                    vals.push(app.getValue(hh.ntkeyRefs));
                w.valueChanged(key, vals, isNew);
            }
        }
    }

    resetWidgets()
    {
        for(let i=0;i<this.pageTemplate.widgets.length;i++)
        {
            let w = this.pageTemplate.widgets[i].widget;
            if(w)
            {
                if(w.config.websubkeys && app.webSubConnected)
                    continue;
                w.reset();
            }
        }
   }

    randomData()
    {
        for(let i=0;i<this.pageTemplate.widgets.length;i++)
        {
            let w = this.pageTemplate.widgets[i].widget;
            if(w)
            {
                if(w.config.websubkeys && app.webSubConnected)
                    continue;
                w.addRandomPt();
            }
        }
    }
}

window.PageHandler = PageHandler;