/* global $ app */

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
    //          .size is the size of a title as "2x3" (rowxcol)
    //              we produce a class of the form: "size2x3" which
    //              is presumed managed by the css grid.
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
        if(this.pageTemplate.widgets)
        {
            let htmllist = [];
            // first build up html (and load it)
            for(let i=0;i<this.pageTemplate.widgets.length;i++)
            {
                let w = this.pageTemplate.widgets[i];
                let sz = w.size.split("X"); 
                if(sz[0] == "fill")
                    sz[0] = "7";
                if(sz[1] == "fill")
                    sz[1] = "6";
                let s = `<div id='${w.id}' ` +
                 `style='grid-column:span ${sz[0]};grid-row:span ${sz[1]}'></div>`;
                htmllist.push(s);
            }
            app.notice("page " + htmllist.join(""));
            loadHtmlCB(htmllist.join(""), function() {
                for(let i=0;i<this.pageTemplate.widgets.length;i++)
                {
                    let w = this.pageTemplate.widgets[i];
                    if(w.type == "html")
                    {
                        var fileref = w.params.url;
                        app.sendGetRequest(fileref, function(html) {
                            var targetElem = $(`#${w.id}`);
                            this.onPageLoaded(targetElem, html);
                            app.replayNetTab(); // triggers onNetTabChange
                        }.bind(this));
                    }
                }
            }.bind(this));
        }
    }

    setNetTabHandler(key, handler)
    {
        if(this.netTabHandlers[key])
            app.warning("nettab collision for " + key);
        this.netTabHandlers[key] = handler;
    }

    onPageLoaded(targetElem, html)
    {
        app.debug("html for " + targetElem + " " + html);
        targetElem.html(html);
        // install callbacks for standard ui elements
    }

    onNetTabChange(key, value, isNew)
    {
        let f = this.netTabHandlers[key];
        if(f == undefined) return;
        f(value, isNew);
    }
}

window.PageHandler = PageHandler;