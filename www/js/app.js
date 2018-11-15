/* global NetworkTables RobotLog $ */

(function(global) {

"use strict";

var app = {
    mainContent: "#mainContent",
    mainNav: "#mainNavList",
    homeHref: "#driver",
    caret: " <span class='caret'></span>",
    openURL: null,
    currentPage: null,
    pageHandlers: {},
    varRegExp: /{\s*(\w+)\s*}/g, /* w is alphnum, s is space*/

    initialize: function()
    {
        document.addEventListener("DOMContentLoaded", 
            this.onReady.bind(this), false);
    },

    logMsg: function(msg, force)
    {
        if(force || true)
        {
            console.log(msg);
        }
    },

    debug: function(msg)
    {
        this.logMsg("DEBUG   " + msg);
    },

    info: function(msg)
    {
        this.logMsg("INFO    " + msg);
    },

    notice: function(msg)
    {
        this.logMsg("NOTICE  " + msg);
    },

    warning: function(msg)
    {
        this.logMsg("WARNING " + msg);
    },

    setPageHandler: function(page, handler)
    {
        this.pageHandlers[page] = handler;
    },

    // onReady is invoked after all scripts have finished loading.
    onReady: function()
    {
        this.debug("deviceready");

        if(window.Layout)
        {
            this.layout = new window.Layout({
                layout: "/layouts/ShuffleBoardLayout.json"
            });
            this.layout.init();
        }
        else
            this.layout = null;

        var initURL = app.homeHref;
        if(window.location.hash)
        {
            // app.logMsg("using window.location.hash: " + window.location.hash);
            initURL = window.location.hash;
            this.navigate(window.location.hash);
        }
        this.navigate(initURL);

        // do this after first navigate
        global.onhashchange = function(arg) {
            this.navigate(window.location.hash);
        }.bind(this);

        NetworkTables.addWsConnectionListener(this.onNetTabConnect.bind(this), true);
        NetworkTables.addRobotConnectionListener(this.onRobotConnect.bind(this), true);
        NetworkTables.addGlobalListener(this.onNetTabChange.bind(this), true);

        RobotLog.addWsConnectionListener(app.onLogConnect, true);
    },

    // navigate: is the primary entrypoint for switch views
    navigate: function(url)
    {
        var fields = url.split("?");
        var params = (fields.length == 2) ? fields[1] : null;
        var page = this.urlToPage(fields[0]);
        if(this.currentPage !== page)
        {
            this.info("navigate: " + page);
            this.currentPage = page;
            this.loadPage(page, this.mainContent);
        }
        if(params !== null)
        {
            this.warning("url params not currently supported");
            // this.updateParams(params);
        }
    },

    updateNav: function()
    {
        // this.logMsg("updateNav ---------------------------------");
        $("#mainNavList").find(".active").removeClass("active");
        // find the parent of the <a> whose href endswith the current page.
        $("#mainNavList a[href$='" + this.currentPage + "']").parent()
                                                           .addClass("active");
    },

    urlToPage: function(href)
    {
        var i = href.lastIndexOf("/");
        return href.slice(i+2); // eliminate hash
    },

    loadPage: function(page, target)
    {
        if(this.layout)
        {
            this.info("loadPage from layout:" + page);
            this.layout.buildPage();
            this.updateNav();
        }
        else
        {
            // this.logMsg("loadPage: " + page);
            var fileref = "/pages/" + page + ".html";
            RobotLog.setLogListener(null, false);
            this.sendGetRequest(fileref, function(html) {
                var targetElem = document.querySelector(target);
                this.pageHandlers[page].pageLoaded(targetElem, html);
                this.replayNetTab(); // triggers onNetTabChange
                this.updateNav();
            }.bind(this));
        }
    },

    interpolate: function(body, map)
    {
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
    onLogConnect: function(cnx)
    {
        app.notice("RobotLog connected");
    },

    // network table callbacks ------------------------------------------------
    onRobotConnect: function(cnx)
    {
        app.robotConnected = cnx;
        $("#robotState").html(cnx ? "<span class='green'>connected</span>" :
                                    "<span class='blinkRed'>off-line</span>");
        $("#robotAddress").html(cnx ? NetworkTables.getRobotAddress() : "<na>");
        app.updateCANStatus();
    },

    updateCANStatus: function()
    {
        if(this.robotConnected)
        {
            var value = app.getValue("CANBusStatus");
            if(value === "OK")
                $("#robotCANStatus").html("CAN Status:<span class='green'>OK</span>");
            else
                $("#robotCANStatus").html(`CAN Status:<span class='blinkRed'>${value}</span>`);
        }
        else
        {
            $("#robotCANStatus").html("");
        }
    },

    onNetTabConnect: function(cnx)
    {
        if(cnx)
        {
            $("#nettabState").html("<span class='green'>connected</span>");
            if(app.pageHandlers[app.currentPage] &&
               app.pageHandlers[app.currentPage].onNetTabConnect) 
            {
                app.pageHandlers[app.currentPage].onNetTabConnect();
            }
        }
        else
        {
            $("#nettabState").html("<span class='blinkRed'>off-line</span>");
        }

        var tval = app.getValue("Build");
        if(tval) {
            $("#buildid").html("<span class='green'>"+tval+"</span");
        }

        
        // We shouldn't putValue here, since it may overwrite
        // robotInit state.
        if(false)
        {
            if(app.getValue("CameraView", "") == "")
                app.putValue("CameraView", "CubeCam");
            var defAuto = "All: Cross Baseline";
            if(app.getValue("AutoStrategyOptions", "") == "")
                app.putValue("AutoStrategyOptions", defAuto);
            if(app.getValue("AutoStrategy", "") == "")
                app.putValue("AutoStrategy", defAuto);
        }
    },

    putValue: function(nm, value)
    {
        if(name == undefined)
        {
            console.error("bad putvalue");
        }
        else
        {
            // for 18.0.1 
            // pynetworktables2js version isn't readily avilable here
            NetworkTables.putValue("SmartDashboard/"+nm, value);
            // for 18.0.2
            // NetworkTables.putValue("/SmartDashboard/"+nm, value);
        }
    },

    getValue: function(nm, def="")
    {
        return NetworkTables.getValue("/SmartDashboard/"+nm, def);
    },

    replayNetTab: function()
    {
        var keys = NetworkTables.getKeys();
        for(var i=0;i<keys.length; i++)
        {
            var key = keys[i];
            app.onNetTabChange(key, NetworkTables.getValue(key), true);
        }
    },

    onNetTabChange: function(key, value, isNew)
    {
        if(false) {
            app.logMsg("nettab entry changed: " + key +
                  " = " + value +
                 " new: " + isNew);
        }
        switch(key) {
            case "/SmartDashboard/CANBusStatus":
                app.updateCANStatus();
                break;
            default:
                break;
        }
        if(!app.pageHandlers[app.currentPage]) return;
        if(app.pageHandlers[app.currentPage].onNetTabChange)
        {
            app.pageHandlers[app.currentPage].onNetTabChange(key, value, isNew);
        }
    },

    // ajax utils -------------------------------------------------------------
    sendGetRequest: function(url, responseHandler)
    {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            app.handleResponse(req, responseHandler, false);
        };
        req.open("GET", url, true);
        req.send(null);
    },

    handleResponse: function(request, responseHandler, isJSON)
    {
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

    // from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    storageAvailable: function(type)
    {
      try {
          var storage = window[type],
              x = "__storage_test__";
          storage.setItem(x, x);
          storage.removeItem(x);
          return true;
      }
      catch(e) {
          return e instanceof DOMException && (
              // everything except Firefox
              e.code === 22 ||
              // Firefox
              e.code === 1014 ||
              // test name field too, because code might not be present
              // everything except Firefox
              e.name === "QuotaExceededError" ||
              // Firefox
              e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
              // acknowledge QuotaExceededError only if there's something already stored
              storage.length !== 0;
        }
    },

    loadImage: function(url)
    {
      return new Promise(resolve => { 
          let i = new Image(); 
          i.onload = () => {
            resolve(i);
          }; 
          i.src=url; 
      });
    },

    downloadURI: function(uri, name)
    {
      var link = document.createElement("a");
      link.target = "_blank";
      link.download = name;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

}; // end of app definition

app.initialize();
global.app = app;
app.notice("Dashboard loaded");

})(window);
