/* global $ app StripChart PathPlot SelectorWidget */

class PageHandler
{
    constructor(config, pageTemplate)
    {
        this.config = config;
        this.pageTemplate = pageTemplate;
        this.ntkeyMap = {}; // maps to widget
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
        if(this.pageTemplate.widgets)
        {
            let htmllist = [];
            // first build up html (and load it)
            for(let i=0;i<this.pageTemplate.widgets.length;i++)
            {
                let w = this.pageTemplate.widgets[i];
                let sz = w.size;
                let style = `<div id='${w.id}' style='`;
                if(sz[0] == "fill")
                    style += "grid-column:1/-1;";
                else
                    style += `grid-column:span ${sz[0]/10};`; // assume 10px per grid

                if(sz[1] == "fill")
                    style += "grid-row:1/-1;";
                else
                if(sz[1] == "row")
                    style += "grid-row: span 4;"; // 40px rows
                else
                    style += `grid-row:span ${sz[1]/10};`; // assume 10px per grid
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
                            this._widgetLoaded();
                        }
                    }
                }
            }.bind(this));
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

    setNetTabHandler(keys, handler)
    {
        if(!keys) return;
        if(!Array.isArray(keys)) // handler may listen to multiple keys
            keys = [keys];
        for(let j=0;j<keys.length;j++)
        {
            let key = keys[j];
            if(this.ntkeyMap[key])
                app.warning("nettab collision for " + key);
            this.ntkeyMap[key] = handler;
        }
    }

    pageLoaded() // may be overridden by subclasses
    {
        let self = this;

        SelectorWidget.installSelectorSupport();

        // String support ----------------------------------------------
        $("input[type=text]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.warning("unknown entry " + id);
            }
            var value = $(this).val();
            app.putValue(ntkey, value);
        });

        // Number support ----------------------------------------------
        $("input[type=number]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.warning("unknown number " + id);
            }
            var value = $(this).val();
            app.putValue(ntkey, Number(value));
        });

        // Slider support ----------------------------------------------
        // slider id mapping must be present in idToSDKey map above
        $("input[type=range]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.warning("unknown slider " + id);
            }
            var value = $(this).val();
            $("#"+id+"Txt").text(value);
            // app.logMsg("slider " + id + ": " + Number(value));
            app.putValue(ntkey, Number(value));
        });

        // checkbox support --------------------------------------------
        $("input[type=checkbox]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.warning("unknown checkbox " + id);
            }
            var value = $(this).prop("checked");
            // app.logMsg("checkbox " + id + ": " + value);
            app.putValue(ntkey, value);
        });

        this.updateWhenNoRobot();
    }

    onNetTabChange(key, value, isNew)
    {
        let hh = this.ntkeyMap[key];
        if(!hh) return;
        let w = hh.widget;
        if(!w) return;

        if(!hh.ntkeyRefs)
            w.valueChanged(key, value, isNew);
        else
        {
            let vals =  [value];
            if(Array.isArray(hh.ntkeyRefs))
            {
                for(let i=0;i<hh.ntkeyRefs.length;i++)
                    vals.push(app.getValue(hh.ntkeyRefs[i]));
            }
            else
                vals.push(app.getValue(hh.ntkeyRefs))
            w.valueChanged(key, vals, isNew);
        }
    }

    updateWhenNoRobot()
    {
        if(!app.robotConnected && app.config.demoMode)
        {
            for(let i=0;i<this.pageTemplate.widgets.length;i++)
            {
                let w = this.pageTemplate.widgets[i].widget;
                if(w)
                    w.addRandomPt();
            }
            setTimeout(this.updateWhenNoRobot.bind(this), 20);  // 50 fps
        }
    }

    
}

window.PageHandler = PageHandler;