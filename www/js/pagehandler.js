/* global $ app StripChart PathPlot */

class PageHandler
{
    constructor(config, pageTemplate)
    {
        this.config = config;
        this.netTabHandlers = {};
        this.pageTemplate = pageTemplate;
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
    //          .nettab is the optional network table entry or pattern
    //          .params are widget-type-specific parameters
    //              html: url
    //
    buildPage(loadHtmlCB)
    {
        this.widgets = [];
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
                    style += `grid-column:span ${sz[0]};`;
                if(sz[1] == "fill")
                    style += "grid-row:1/-1;";
                else
                    style += `grid-row:span ${sz[1]};`;
                style += "'></div>";
                htmllist.push(style);
            }
            app.debug("pagegrid " + htmllist.join(""));
            loadHtmlCB(htmllist.join(""), function() {
                // we'd like a single callback after all the dust associated
                // with loading widgets settles.   
                this.numWidgetsToLoad = this.pageTemplate.widgets.length;
                for(let i=0;i<this.pageTemplate.widgets.length;i++)
                {
                    let w = this.pageTemplate.widgets[i];
                    var targetElem = $(`#${w.id}`);
                    if(w.type == "html")
                    {
                        var fileref = w.params.url;
                        app.sendGetRequest(fileref, function(html) {
                            targetElem.html(html);
                            this._widgetLoaded();
                        }.bind(this));
                    }
                    else
                    {
                        let html;
                        switch(w.type)
                        {
                        case "systemstate":
                            html = "<div class='systemstate'>";
                            html += `<label>${w.label}</label>&nbsp;&nbsp;`;
                            html += "STATE <span class='data' id='${w.id}State'>n/a</span>";
                            html += "&nbsp;";
                            html += "STATUS <span class='data' id='${w.id}Status'>n/a</span>";
                            html += "<hr />";
                            html += "</div>";
                            break;
                        case "stripchart":
                            html = "<div class='plotContainer'>";
                            html += `<label>${w.label}</label>`;
                            html += "<div id='${w.id}' class='stripChart'></div>";
                            html += "</div>";
                            this.widgets.push(new StripChart(w.params));
                            break;
                        case "pathplot":
                            html = "<div class='plotContainer'>";
                            html += `<label>${w.label}</label>`;
                            html += "<div id='${w.id}' class='pathPlot'></div>";
                            html += "</div>";
                            this.widgets.push(new PathPlot(w.params));
                            break;
                        case "slider":
                            break; 
                        case "checkbox":
                            break; 
                        case "menubutton":
                            break; 
                        case "gage":
                            break;
                        // more widgets here.
                        default:
                            app.warning("unimplemented widget type " + w.type);
                            break;
                        }
                        if(html)
                        {
                            targetElem.html(html);
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
            app.replayNetTab(); // triggers onNetTabChange
        }
    }

    setNetTabHandler(key, handler)
    {
        if(this.netTabHandlers[key])
            app.warning("nettab collision for " + key);
        this.netTabHandlers[key] = handler;
    }

    pageLoaded()
    {
        // may be overridden by subclasses

        // Selector (pulldown menu) support ------------------------------
        // assume that the id of the selector matches the SmartDashboard key.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            // var ntkey = "/SmartDashboard/" + key;
            var val = app.getValue(key);
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            app.putValue(key, value);
        });

        // String support ----------------------------------------------
        $("input[type=text]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.logMsg("unknown entry " + id);
            }
            var value = $(this).val();
            app.putValue(ntkey, value);
        });

        // Number support ----------------------------------------------
        $("input[type=number]").on("input", function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.logMsg("unknown number " + id);
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
                app.logMsg("unknown slider " + id);
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
                app.logMsg("unknown checkbox " + id);
            }
            var value = $(this).prop("checked");
            // app.logMsg("checkbox " + id + ": " + value);
            app.putValue(ntkey, value);
        });
    }

    onNetTabChange(key, value, isNew)
    {
        let f = this.netTabHandlers[key];
        if(f == undefined) return;
        f(value, isNew);
    }
}

window.PageHandler = PageHandler;