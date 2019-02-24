/* global app NetworkTables RobotLog WebAPISubscriber $ Widget RobotState*/

/* special url config syntax:
 *
 *   http://localhost:5080/?shownav=0&demo=1&layout=filename.json&env=dana&#tab0
 *
 *  url hash selects the current nav page:
 *      #tab0, follows the optional configuration
 *
 *  shownav controls display of navbar
 *  demo controls whether random data is generated
 *  env selects different layout variants according to provided key
 *  layout must be located below www/layouts dir
 *
 */
class App
{
    constructor()
    {
        this.mainContent = "#mainContent";
        this.mainNav = "#mainNavList";
        this.homeHref = "#tab0";
        this.caret = " <span class='caret'></span>";
        this.openURL = null;
        this.currentPage = null;
        this.pageHandlers = {};
        this.varRegExp = /{\s*(\w+)\s*}/g; /* w is alphnum, s is space*/
        this.config = {}; // XXX: load via .json file?
        this.config.debug = false;
        this.config.shownav = true;
        this.config.netTabVersion = 1802;
        this.config.demoMode = false;
        this.config.layout = "/layouts/layout2019.json";
        this.config.layoutEnv = "default";
        this.config.demomode = false;

        // nb: initialization of js members occurs in 'onReady'
        this.robotAddr = null;
        this.robotLog = null;
        this.robotConnected = false;
        this.robotBatteryW = null;
        this.robotCurrentW = null;
        this.robotState = null; 
        this.webapi = null;
        this.opencv = {};
        this.opencv.loaded = false; // accessed directly by opencv factory

        document.addEventListener("DOMContentLoaded",
            this.onReady.bind(this), false);

    }

    logMsg(msg)
    {
        console.log(msg);
    }

    debug(msg)
    {
        if(this.config.debug)
            this.logMsg("DEBUG   " + msg);
    }

    info(msg)
    {
        this.logMsg("INFO    " + msg);
    }

    notice(msg)
    {
        this.logMsg("NOTICE  " + msg);
    }

    warning(msg)
    {
        this.logMsg("WARNING " + msg);
    }

    error(msg)
    {
       // todo add alert?
        this.logMsg("ERROR " + msg);
    }

    setPageHandler(page, handler)
    {
        this.pageHandlers[page] = handler;
    }

    // onReady is invoked after all scripts have finished loading.
    onReady()
    {
        this.firstLoad = false;
        this.robotState = new RobotState();
        this.robotLog = new RobotLog();
        this.robotLog.addWsConnectionListener(this.onLogConnect.bind(this),
                                                true);
        this.webapi = new WebAPISubscriber();
        this.webapi.addWsConnectionListener(this.onWebSubConnect.bind(this));
        this.webapi.addSubscriber(this.onWebSubMsg.bind(this));

        NetworkTables.addWsConnectionListener(this.onNetTabConnect.bind(this),
                                                true);
        NetworkTables.addRobotConnectionListener(this.onRobotConnect.bind(this),
                                                true);
        NetworkTables.addGlobalListener(this.onNetTabChange.bind(this), true);

        // on boot, make sure that we don't attempt to open channels
        // to unconnected robot.
        if(null == this.getValue("Driver/Camera1", null))
            this.putValue("Driver/Camera1", "Test");
        if(null == this.getValue("Driver/Camera2", null))
            this.putValue("Driver/Camera2", "Test");
        if(null == this.getValue("Driver/VideoStream", null))
            this.putValue("Driver/VideoStream", "Test");

        this._parseURLSearch(); // override layout and env
        this.layout = new window.Layout({
            layout: this.config.layout,
            envname: this.config.layoutEnv,
            onLoad: this.onLayoutLoaded.bind(this)
        });
    }

    registerPageIdler(h, interval, clientdata)
    {
        if(!this.idleHandlerId)
        {
            this.idleHandlerId = 1;
            this.idleHandlers = {};
        }
        let id = "idleId"+this.idleHandlerId++;
        this.idleHandlers[id] = {
            handler: h,
            interval: interval,
            lastfired: 0,
            clientdata: clientdata
        };

        return id;
    }

    clearPageIdlers()
    {
        this.idleHandlers = {};
        this.idleHandlerId = 1;
    }

    onIdle()
    {
        let now = Date.now();
        if(!this.robotConnected && this.currentPage)
        {
            if (this.config.demoMode && this.config.demoMode == 1)
            {
                // this confuses matters when going in and out
                // of robotConnection state
                this.robotBatteryW.addRandomPt();
                this.robotCurrentW.addRandomPt();
                this.robotState.addRandomPose();
                this.pageHandlers[this.currentPage].randomData();
            }
        }
        if(this.idleHandlers)
        {
            for(let key in this.idleHandlers)
            {
                let h = this.idleHandlers[key];
                if((now - h.interval) > h.lastfired)
                {
                    try
                    {
                        h.handler(h.clientdata);
                    }
                    catch(e)
                    {
                        app.error("idleHandler error:" + e);
                    }
                    h.lastfired = Date.now();
                }
            }
        }
        const fps = 30;
        setTimeout(this.onIdle.bind(this), 1000/fps);
    }

    onLayoutLoaded()
    {
        // install globally visible widgets
        let targetEl = $(document.getElementById("batteryVoltage"));
        if(targetEl)
            this._buildVoltageWidget(targetEl);

        targetEl = $(document.getElementById("inputCurrent"));
        if(targetEl)
            this._buildCurrentWidget(targetEl);

        var initURL = this.homeHref;
        if(window.location.hash)
        {
            // app.logMsg("using window.location.hash: "+window.location.hash);
            initURL = window.location.hash;
            this.navigate(window.location.hash);
        }
        this.navigate(initURL);

        // do this after first navigate
        window.onhashchange = function(arg) {
            this.navigate(window.location.hash);
        }.bind(this);

        this.onIdle();
    }

    _buildVoltageWidget(targetEl, style="stripchart")
    {
        if(style == "pctbar")
        {
            this.robotBatteryW = Widget.BuildWidgetByName("pctbar",
            {
                size: [60, 32],
                id: "batteryVoltage",
                ntkeys: "/SmartDashboard/Robot/BatteryVoltage",
                params:
                {
                    barStyle:
                    {
                        radius: 5,
                        range: [0, 12.4],
                        orient: "horizontal",
                        fillSelector: function(v)
                        {
                            if(v>10)
                                return "rgb(0,128,0)";
                            if(v>9)
                                return "rgb(64,64,0)";
                            return "rgb(64,0,0)";
                        }
                    },
                    labelStyle:
                    {
                        fill: "#aaa",
                        font: "20px Fixed",
                        formatter: function(v)
                        {
                            return v.toFixed(1)+" V";
                        }
                    }
                }
            },
            targetEl, undefined /* pageHandler */);
        }
        else
        {
            this.robotBatteryW = Widget.BuildWidgetByName("stripchart",
            {
                "id": "batteryVoltage",
                "type": "stripchart",
                "size": [100, 48],
                "ntkeys": "/SmartDashboard/Robot/BatteryVoltage",
                "params": {
                    "plot": {
                        "yaxis": {
                            "show": false,
                            "min": 0,
                            "max": 13
                        },
                        "fillvalue": 10,
                        "colors":["rgb(255, 255, 0)"],
                        "channelcount": 1,
                        "widths": [2],
                        "maxlength": 100,
                    },
                }
            }, targetEl, undefined/*nopagehandler*/);
        }
    }

    _buildCurrentWidget(targetEl)
    {
        this.robotCurrentW = Widget.BuildWidgetByName("stripchart",
            {
                "id": "inputCurrentChart",
                "type": "stripchart",
                "size": [100, 48],
                "ntkeys": "/SmartDashboard/Robot/BatteryCurrent",
                "params": {
                    "plot": {
                        "yaxis": {
                            "min": 0,
                            "max": 2,
                            "show": false,
                        },
                        "fillvalue": 0,
                        "colors":["rgb(255, 80, 0)"],
                        "channelcount": 1,
                        "widths": [2],
                        "maxlength": 100,
                   },
                }
            },
            targetEl, undefined/*nopagehandler*/);
    }

    // navigate: is the primary entrypoint for switch views
    navigate(hash)
    {
        if(hash == "")
            hash = this.homeHref;
        let page = hash.slice(1); // works for empty
        if(this.currentPage !== page)
        {
            this.debug("navigate: " + page);
            this.loadPage(page);
        }
        this._parseURLSearch();
    }

    _parseURLSearch()
    {
        if(window.location.search.length <= 0)
            return;

        let url = new URL(window.location);
        for(let pair of url.searchParams.entries())
        {
            switch(pair[0])
            {
            case "demo":
                this.config.demoMode = pair[1];
                break;
            case "shownav":
                if(pair[1] == 0)
                {
                    //$("header").addClass("hidden");
                    $("header").css("display", "none");
                    $("#mainlayout").css("margin-top", "0px");
                    this.config.shownav = false;
                }
                else
                {
                    $("header").css("display", "inline");
                    $("#mainlayout").css("margin-top", "40px");
                    this.config.shownav = true;
                }
                break;
            case "layout":
                this.config.layout = "/layouts/" + pair[1];
                break;
            case "env":
                this.config.layoutEnv = pair[1];
                break;
            default:
                app.notice("unexpected url parameter:" + pair[0]);
                break;
            }
        }
    }

    updateNav()
    {
        $("nav").find(".active").removeClass("active");
        // find the parent of the <a> whose href endswith the current page.
        $("nav a[href$='" + this.currentPage + "']").parent()
                                                    .addClass("active");
    }

    loadPage(page)
    {
        this.debug("loadPage layout " + page);
        if(this.currentPage && this.pageHandlers[this.currentPage])
        {
            this.pageHandlers[this.currentPage].cleanup();
        }
        this.robotLog.setLogListener(null, false); // clear log listener
        this.clearPageIdlers();
        this.currentPage = page;
        let ph = this.layout.buildContentPage(page);
        if(!this.pageHandlers[page])
            this.pageHandlers[page] = ph;
        this.updateNav();
        this.replayNetTab();
    }

    interpolate(body, map)
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
    }

    // webapi callbacks --------------------------------------------------
    onWebSubConnect(cnx)
    {
        this.notice("webapi subscriber connected");
        this.webSubConnected = true;
    }

    onWebSubMsg(cls, data)
    {
        if(!this.pageHandlers[this.currentPage])
        {
            this.debug("onWebSubMsg missing page handler for " +
                        this.currentPage);
        }
        // Currently we only distribute changes to current page.
        // This means that any history is lost for non-visible changes.
        // On the other hand, we don't waste cycles and memory on history
        // that the user may not care about.
        if(this.pageHandlers[this.currentPage].onWebSubMsg)
        {
            this.pageHandlers[this.currentPage].onWebSubMsg(cls, data);
        }
    }


    // robotlog callbacks ------------------------------------------------
    onLogConnect(cnx)
    {
        this.info("robotLog connected:" + cnx);
    }

    // network table callbacks ------------------------------------------------
    getRobotAddr()
    {
        return this.robotAddr;
    }

    getRobotState()
    {
        return this.robotState;
    }

    onRobotConnect(cnx)
    {
        this.robotConnected = cnx;
        if(cnx)
        {
            if(!this.robotConnections)
                this.robotConnections = 1;
            else
                this.robotConnections++;
            this.robotAddr = NetworkTables.getRobotAddress();
            if(this.robotAddr == null)
                this.robotAddr = "10.49.15.2";
        }
        else
            this.robotAddr = null;
        $("#robotStatus").html(cnx ? "<span class='green'>connected</span>" :
                                    "<span class='blinkRed'>off-line</span>");
        $("#robotAddress").html(this.robotAddr ? this.robotAddr : "<n/a>");
        this.updateCANStatus();
    }

    updateCANStatus()
    {
        if(this.robotConnected)
        {
            var value = this.getValue("CANBusStatus");
            if(value === "OK")
                $("#robotCANStatus").html(
                    "CAN Status:<span class='green'>OK</span>");
            else
                $("#robotCANStatus").html(
                    `CAN Status:<span class='blinkRed'>${value}</span>`);
        }
        else
        {
            $("#robotCANStatus").html("");
        }
    }

    onNetTabConnect(cnx)
    {
        if(cnx)
        {
            $("#nettabState").html("<span class='green'>connected</span>");
            if(this.pageHandlers[this.currentPage] &&
               this.pageHandlers[this.currentPage].onNetTabConnect)
            {
                this.pageHandlers[this.currentPage].onNetTabConnect();
            }
        }
        else
        {
            $("#nettabState").html("<span class='blinkRed'>off-line</span>");
        }

        // We shouldn't putValue here, since it may overwrite
        // robotInit state.
        if(false)
        {
            if(this.getValue("CameraView", "") == "")
                this.putValue("CameraView", "CubeCam");
            var defAuto = "All: Cross Baseline";
            if(this.getValue("AutoStrategyOptions", "") == "")
                this.putValue("AutoStrategyOptions", defAuto);
            if(this.getValue("AutoStrategy", "") == "")
                this.putValue("AutoStrategy", defAuto);
        }
    }

    ntkeyNormalize(k)
    {
        if(!k)
            return k;
        if(k[0] != "/")
            k = "/SmartDashboard/" + k;
        return k;
    }

    ntkeyCompare(a, b)
    {
        if(a == b) return true;

        a = this.ntkeyNormalize(a);
        b = this.ntkeyNormalize(b);
        return a == b;
    }

    putValue(nm, value)
    {
        if(!nm || nm == "undefined")
        {
            this.warning("unnamed putValue with value " + value);
            return;
        }
        if(value === undefined|| value === null)
        {
            this.warning("invalid putValue for " + nm);
            return;
        }
        else
        {
            let k = this.ntkeyNormalize(nm);
            if(this.config.netTabVersion <= 1801)
            {
                // for 18.0.1
                NetworkTables.putValue(k.slice(1), value);
            }
            else
            {
                // for 18.0.2
                NetworkTables.putValue(k, value);
            }
        }
    }

    getValue(nm, def="")
    {
        let k = this.ntkeyNormalize(nm);
        return NetworkTables.getValue(k, def);
    }

    replayNetTab()
    {
        var keys = NetworkTables.getKeys();
        for(var i=0;i<keys.length; i++)
        {
            var key = keys[i];
            this.onNetTabChange(key, NetworkTables.getValue(key), true);
        }
    }

    onNetTabChange(key, value, isNew)
    {
        this.debug(`nettab entry changed: ${key}=${value}, new:${isNew}`);

        //  app must handle its own special vals
        switch(key)
        {
        case "/SmartDashboard/CANBusStatus":
            this.updateCANStatus();
            break;
        case "/SmartDashboard/Build":
            $("#buildid").html("<span class='weak'>"+value+"</span");
            break;
        case "/SmartDashboard/Status":
            $("#statusmsg").html(value);
            break;
        case "/SmartDashboard/Robot/BatteryVoltage":
            if(this.robotBatteryW)
                this.robotBatteryW.valueChanged(key, value, isNew);
            break;
        case "/SmartDashboard/Robot/BatteryCurrent":
            if(this.robotCurrentW)
                this.robotCurrentW.valueChanged(key, value, isNew);
            break;
        case "/SmartDashboard/Robot/GamePhase":
            this.robotState.changeGamePhase(value);
            switch(value)
            {
            case "ROBOT INIT":
                this.info("ROBOT INIT... clearing widgets");
                if(this.currentPage && this.pageHandlers[this.currentPage])
                    this.pageHandlers[this.currentPage].resetWidgets();
                break;
            case "DISABLED":
                break;
            case "AUTONOMOUS":
                break;
            case "TELEOP":
                break;
            case "TEST":
                break;
            case "OFFLINE":
                break;
            default:
                app.warning("app encountered unexpected game phase: " + value);
                break;
            }
            break;
        case "/SmartDashboard/Robot/pose":
            break;
        }

        // Handler for auto-widgets whose id is their nettabkey
        // /SmartDashboard/Robot/Foo -> Robot/Foo
        let id;
        let fields  = key.split("/");
        let i = fields.indexOf("SmartDashboard");
        if(i == -1)
            id = key;
        else
            id = fields.slice(i+1).join("/");
        let el = document.getElementById(id);
        if(el && el.className)
        {
            if(el.className.indexOf("nettabtxt") != -1)
                el.innerHTML = value;
        }

        if(!this.pageHandlers[this.currentPage])
        {
            this.debug("onNetTabChange: missing page handler for " +
                        this.currentPage);
            return;
        }
        // Currently we only distribute changes to current page.
        // This means that any history is lost for non-visible changes.
        // On the other hand, we don't waste cycles and memory on history
        // that the user may not care about.
        if(this.pageHandlers[this.currentPage].onNetTabChange)
        {
            this.pageHandlers[this.currentPage].onNetTabChange(key,value,isNew);
        }
    }

    // ajax utils -------------------------------------------------------
    sendGetRequest(url, responseHandler, isJSON)
    {
        var req = new XMLHttpRequest();
        if(isJSON == undefined) isJSON = false;
        // XXX: use 'onload'
        req.onreadystatechange = function() {
            this.handleResponse(req, responseHandler, isJSON);
        }.bind(this);
        req.open("GET", url, true);
        req.send(null);
    }

    handleResponse(request, responseHandler, isJSON)
    {
        if((request.readyState == 4) && (request.status == 200))
        {
            if(isJSON)
            {
                try
                {
                    let val = JSON.parse(request.responseText);
                    // Looking for variable substitions during layout loads?
                    //  see: layout.js.
                    responseHandler(val);

                }
                catch(e)
                {
                   this.error("http response json error: " + e);
                }
            }
            else
            {
                responseHandler(request.responseText);
            }
        }
    }

    loadImage(url)
    {
        return new Promise(resolve => {
            let i = new Image();
            i.onload = () => {
                resolve(i);
            };
            i.src = url;
        });
    }

    downloadURI(uri, name)
    {
        var link = document.createElement("a");
        link.target = "_blank";
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
} // end of App class

window.app = new App();
window.app.notice("Dashboard app loaded");
