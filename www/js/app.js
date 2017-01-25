(function(global) {
'use strict';
var app = {
    mainContent: "#mainContent",
    homeHref: "#driver",
    openURL: null,
    m_nettab: {},

    initialize: function() {
        document.addEventListener("DOMContentLoaded", this.onReady, false);
    },

    logMsg: function(msg, force) {
        if(force || true) {
            console.log(msg);
        }
    },

    // onReady is invoked after all scripts have finished loading.
    onReady: function() { // event callback, 'this' not valid
        app.logMsg("deviceready");
        if(window.location.hash) {
            app.logMsg("using window.location.hash: " + window.location.hash);
            app.navigate(window.location.hash);
        }

        // do this after first navigate
        global.onhashchange = function(arg) {
            app.navigate(window.location.hash);
        }

        NetworkTables.addWsConnectionListener(app.onNetTabConnect, true);
        NetworkTables.addRobotConnectionListener(app.onRobotConnect, true);
        NetworkTables.addGlobalListener(app.onNetTabChange, true);
    },

    // navigate: is the primary entrypoint for switch views
    navigate: function(url) {
        this.logMsg("navigate: " + url);
        if(url === "")
        {
            this.loadPage("info", this.mainContent);
        }
        else
        if(!this.pageIsVisible("#mainNavList>li>a", url))
        {
            this.loadPage(url.slice(1), this.mainContent);
        }
    },

    loadPage: function(page, target) {
        var fileref = "/pages/" + page + ".html";
        this.sendGetRequest(fileref, function(html) {
            var targetElem = document.querySelector(target);
            targetElem.innerHTML = html;
            app.afterPageLoad(page);
            // after a page is loaded we may need to refresh its connent
            // for example, the network tables table
        });
    },

    afterPageLoad: function(page) {
        switch(page) {
        case "drivers":
            
            break;
        case "nettab":
            break;
        case "developers":
            break;
        }
    },

    // pageIsVisible: given a selector url (ie: #developr), check
    //     whether the associated page is already displayed.
    pageIsVisible: function(selector, url) {
        var mustload = false;
        var itemlist = document.querySelectorAll(selector);
        if(itemlist === null)
        {
            this.logMsg("ERROR Can't find items for: " + selector);
        }
        else
        {
            var i;
            for(i=0;i<itemlist.length; i++)
            {
                var item = itemlist[i];
                var classes = item.className;
                if(item.href === url)
                {
                    if(classes.indexOf(" active") === -1)
                    {
                        classes += " active";
                        item.classname = classes;
                        mustload = true;
                    }
                }
                else {
                    item.className = classes.replace(/active/g, "");
                }
            }
        }
        return mustload;
    },

    // network table callbacks ------------------------------------------------
    onRobotConnect: function(cnx) {
        $("#robotState").html(cnx ? "<span class='green'>connected</span>" :
                                    "<span class='amber'>disconnected</span>");
        $("#robotAddress").html("@: " + cnx ? NetworkTables.getRobotAddress() : "<na>");
    },

    onNetTabConnect: function(cnx) {
        if(cnx)
        {
            $("#nettabState").html("<span class='green'>connected</span>");
            // clear the table here.
            $("#nt tbody > tr").remove();
        }
        else
        {
            $("#connectState").text("<span class='amber'>disconnected</span>");
        }
    },

    onNetTabChange: function(key, value, isNew) {
        app.m_nettab[key] = value;
        app.logMsg("nettab entry changed: " + key +
                    " = " + value +
                    " new: " + isNew);
    },

    // ajax utils -------------------------------------------------------------
    sendGetRequest: function(url, responseHandler) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            app.handleResponse(req, responseHandler, false);
        }
        req.open("GET", url, true);
        req.send(null);
    },

    handleResponse: function(request, responseHandler, isJSON) {
        if((request.readyState == 4) && (request.status == 200))
        {
            if(isJSON)
            {
                responseHandler(JSON.parse(request.responseText));
            }
            else
            {
                responseHandler(request.responseText);
            }
        }
    },

}; // end of app definition

app.initialize();
app.logMsg("app loaded", true);
global.app = app;

})(window);
