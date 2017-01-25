(function(global) {
'use strict';
var app = {
    mainContent: "#mainContent",
    mainNav: "#mainNavList",
    homeHref: "#driver",
    caret: " <span class='caret'></span>",
    openURL: null,
    currentPage: null,
    varRegExp: /{\s*(\w+)\s*}/g, /* w is alphnum, s is space*/

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
            this.updateParams(params);
        }
    },

    updateNav: function() {
        // this.logMsg("updateNav");
        $("#mainNavList").find(".active").removeClass("active");
        // find the parent of the <a> whose href endswith the current page.
        $("#mainNavList a[href$='" + this.currentPage + "']").parent()
                                                           .addClass("active");
    },

    updateParams: function(params) {
    },

    urlToPage: function(href) {
        var i = href.lastIndexOf("/");
        return href.slice(i+2); // eliminate hash
    },

    loadPage: function(page, target) {
        // this.logMsg("loadPage: " + page);
        var fileref = "/pages/" + page + ".html";
        this.sendGetRequest(fileref, function(html) {
            var targetElem = document.querySelector(target);
            app[page + "PageLoaded"](targetElem, html);
            // after a page is loaded we may need to refresh its connent
            // for example, the network tables table
        });
    },

    driverPageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
        loadCameraOnConnect({
            container: '#driverCam',      // where to put the img tag
            proto: null,                  // optional, defaults to http://
            host: null,                   // optional, if null will use robot's autodetected IP address
            port: 5800,                   // webserver port
            image_url: '/?action=stream', // mjpg stream of camera
            data_url: '/program.json',    // used to test if connection is up
            wait_img: null,               // optional img to show when not connected, can use SVG instead
            error_img: null,              // optional img to show when error connecting, can use SVG instead
            attrs: {                      // optional: attributes set on svg or img element
                width: 400,               // optional, stretches image to this width
                height: 300,              // optional, stretches image to this width
            }
        });
        loadCameraOnConnect({
            container: '#sprocketCam',      // where to put the img tag
            proto: null,                  // optional, defaults to http://
            host: "http://10.49.15.4",                   // optional, if null will use robot's autodetected IP address
            port: 5805,                   // webserver port
            image_url: '/?action=stream', // mjpg stream of camera
            data_url: '/program.json',    // used to test if connection is up
            wait_img: null,               // optional img to show when not connected, can use SVG instead
            error_img: null,              // optional img to show when error connecting, can use SVG instead
            attrs: {                      // optional: attributes set on svg or img element
                width: 400,               // optional, stretches image to this width
                height: 300,              // optional, stretches image to this width
            }
        });
        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            var val = NetworkTables.getValue(ntkey + "/selected");
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            NetworkTables.putValue(ntkey + "/selected", value);
        });
    },

    developerPageLoaded: function(targetElem, html) {
        var map = {
            loglevels:  "<option>DEBUG</option>"+
                        "<option>INFO</option>"+
                        "<option>NOTICE</option>"+
                        "<option>WARNING</option>"+
                        "<option>ERROR</option>",
        };
        targetElem.innerHTML = this.interpolate(html, map);

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            var val = NetworkTables.getValue(ntkey + "/selected");
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            NetworkTables.putValue(ntkey + "/selected", value);
        });
    },

    nettabPageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
        this.rebuildNetTab();
    },

    aboutPageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
        $("#logo").animate({
            width: "333px",
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
        // app.logMsg("nettab entry changed: " + key +
        //           " = " + value +
        //           " new: " + isNew);

        if(app.currentPage == "nettab")
        {
            // key thing here: we're using the various NetworkTable keys as
            // the id of the elements that we're appending, for simplicity. However,
            // the key names aren't always valid HTML identifiers, so we use
            // the NetworkTables.keyToId() function to convert them appropriately
            if (isNew)
            {
                var tr = $('<tr></tr>').appendTo($('#networktable > tbody:last'));
                $('<td></td>').text(key).appendTo(tr);
                $('<td></td>').attr('id', NetworkTables.keyToId(key))
                               .text(value)
                               .appendTo(tr);
            }
            else
            {
                // similarly, use keySelector to convert the key to a valid jQuery
                // selector. This should work for class names also, not just for ids
                $('#' + NetworkTables.keySelector(key)).text(value);
            }
        }
    },

    rebuildNetTab: function() {
        var keys = NetworkTables.getKeys();
        for(var i=0;i<keys.length; i++)
        {
            var key = keys[i];
            app.onNetTabChange(key, NetworkTables.getValue(key), true);
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
app.logMsg("Dashboard loaded", true);
global.app = app;

})(window);
