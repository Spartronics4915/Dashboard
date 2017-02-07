(function(global) {
'use strict';
var app = {
    mainContent: "#mainContent",
    mainNav: "#mainNavList",
    homeHref: "#driver",
    caret: " <span class='caret'></span>",
    openURL: null,
    currentPage: null,
    pageHandlers: {},
    varRegExp: /{\s*(\w+)\s*}/g, /* w is alphnum, s is space*/

    initialize: function() {
        document.addEventListener("DOMContentLoaded", this.onReady, false);
    },

    logMsg: function(msg, force) {
        if(force || true) {
            console.log(msg);
        }
    },

    setPageHandler: function(page, handler) {
        this.pageHandlers[page] = handler;
    },

    // onReady is invoked after all scripts have finished loading.
    onReady: function() { // event callback, 'this' not valid
        // app.logMsg("deviceready");
        var initURL = app.homeHref;
        if(window.location.hash)
        {
            // app.logMsg("using window.location.hash: " + window.location.hash);
            initURL = window.location.hash;
            app.navigate(window.location.hash);
        }
        app.navigate(initURL);

        // do this after first navigate
        global.onhashchange = function(arg) {
            app.navigate(window.location.hash);
        }

        NetworkTables.addWsConnectionListener(app.onNetTabConnect, true);
        NetworkTables.addRobotConnectionListener(app.onRobotConnect, true);
        NetworkTables.addGlobalListener(app.onNetTabChange, true);

        RobotLog.addWsConnectionListener(app.onLogConnect, true);
    },

    // navigate: is the primary entrypoint for switch views
    navigate: function(url) {
        var fields = url.split("?");
        var params = (fields.length == 2) ? fields[1] : null;
        var page = this.urlToPage(fields[0]);
        if(this.currentPage !== page)
        {
            // this.logMsg("navigate: " + page);
            this.currentPage = page;
            this.loadPage(page, this.mainContent);
            this.updateNav();
        }
        if(params !== null)
        {
            this.logMsg("url params not current supported");
            // this.updateParams(params);
        }
    },

    updateNav: function() {
        // this.logMsg("updateNav");
        $("#mainNavList").find(".active").removeClass("active");
        // find the parent of the <a> whose href endswith the current page.
        $("#mainNavList a[href$='" + this.currentPage + "']").parent()
                                                           .addClass("active");
    },

    urlToPage: function(href) {
        var i = href.lastIndexOf("/");
        return href.slice(i+2); // eliminate hash
    },

    loadPage: function(page, target) {
        // this.logMsg("loadPage: " + page);
        var fileref = "/pages/" + page + ".html";
        RobotLog.setLogListener(null, false);
        this.sendGetRequest(fileref, function(html) {
            var targetElem = document.querySelector(target);
            app.pageHandlers[page].pageLoaded(targetElem, html);
            // after a page is loaded we may need to refresh its connent
            // for example, the network tables table
        });
    },

    interpolate: function(body, map) {
        var result = body.replace(this.varRegExp,
            function(match, capture) {
                var mm = map[capture];
                if (typeof mm === "undefined") {
                    return match;
                }
                else
                {
                    return map[capture];
                }
            });
        return result;
    },

    // robotlog callbacks ------------------------------------------------
    onLogConnect: function(cnx) {
        app.logMsg("RobotLog connected");
    },

    // network table callbacks ------------------------------------------------
    onRobotConnect: function(cnx) {
        app.robotConnected = cnx;
        $("#robotState").html(cnx ? "<span class='green'>connected</span>" :
                                    "<span class='amber'>disconnected</span>");
        $("#robotAddress").html(cnx ? NetworkTables.getRobotAddress() : "<na>");
    },

    onNetTabConnect: function(cnx) {
        if(cnx)
        {
            $("#nettabState").html("<span class='green'>connected</span>");
            if(app.pageHandlers[app.currentPage].onNetTabConnect) {
                app.pageHandlers[app.currentPage].onNetTabConnect();
            }
        }
        else
        {
            $("#nettabState").html("<span class='amber'>disconnected</span>");
        }

        var tval = NetworkTables.getValue("/SmartDashboard/Build");
        if(tval) {
            $("#buildid").html("<span class='green'>"+tval+"</span");
        }
    },

    onNetTabChange: function(key, value, isNew) {
        // app.logMsg("nettab entry changed: " + key +
        //          " = " + value +
        //         " new: " + isNew);
        switch(key) {
            case "/SmartDashboard/Build":
                $("#buildid").html("<span class='green'>"+tval+"</span");
                break;
            default:
                break;
        }
        if(app.pageHandlers[app.currentPage].onNetTabChange)
        {
            app.pageHandlers[app.currentPage].onNetTabChange(key, value, isNew);
        }
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
global.app = app;
app.logMsg("Dashboard loaded", true);

})(window);
