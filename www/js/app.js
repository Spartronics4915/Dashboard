/* global NetworkTables RobotLog $ */

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
        this.config.netTabVersion = 1802;
        this.config.demoMode = true;
        this.config.layout = "/layouts/layout2019.json";

        this.robotLog = null;
        this.robotConnected = false;

        document.addEventListener("DOMContentLoaded", 
            this.onReady.bind(this), false);
        
        // nb: initialization of js members occurs in 'onReady'
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
        this.debug("deviceready");

        this.robotLog = new RobotLog();

        NetworkTables.addWsConnectionListener(this.onNetTabConnect.bind(this), true);
        NetworkTables.addRobotConnectionListener(this.onRobotConnect.bind(this), true);
        NetworkTables.addGlobalListener(this.onNetTabChange.bind(this), true);
        this.robotLog.addWsConnectionListener(this.onLogConnect.bind(this), true);

        this.layout = new window.Layout({
            layout: this.config.layout,
            onLoad: this.onLayoutLoaded.bind(this)
        });
    }

    onLayoutLoaded()
    {
        var initURL = this.homeHref;
        if(window.location.hash)
        {
            // app.logMsg("using window.location.hash: " + window.location.hash);
            initURL = window.location.hash;
            this.navigate(window.location.hash);
        }
        this.navigate(initURL);

        // do this after first navigate
        window.onhashchange = function(arg) {
            this.navigate(window.location.hash);
        }.bind(this);
    }

    // navigate: is the primary entrypoint for switch views
    navigate(url)
    {
        var fields = url.split("?");
        var params = (fields.length == 2) ? fields[1] : null;
        var page = this.urlToPage(fields[0]);
        if(this.currentPage !== page)
        {
            this.info("navigate: " + page);
            this.currentPage = page;
            this.loadPage(page);
        }
        if(params !== null)
        {
            this.warning("url params not currently supported");
            // this.updateParams(params);
        }
    }

    updateNav()
    {
        $("nav").find(".active").removeClass("active");
        // find the parent of the <a> whose href endswith the current page.
        $("nav a[href$='" + this.currentPage + "']").parent()
                                                    .addClass("active");
    }

    urlToPage(href)
    {
        var i = href.lastIndexOf("/");
        return href.slice(i+2); // eliminate hash
    }

    loadPage(page)
    {
        this.robotLog.setLogListener(null, false); // clear log listener
        this.debug("loadPage layout " + page);
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

    // robotlog callbacks ------------------------------------------------
    onLogConnect(cnx)
    {
        this.notice("RobotLog connected");
    }

    // network table callbacks ------------------------------------------------
    onRobotConnect(cnx)
    {
        this.robotConnected = cnx;
        $("#robotState").html(cnx ? "<span class='green'>connected</span>" :
                                    "<span class='blinkRed'>off-line</span>");
        $("#robotAddress").html(cnx ? NetworkTables.getRobotAddress() : "<na>");
        this.updateCANStatus();
    }

    updateCANStatus()
    {
        if(this.robotConnected)
        {
            var value = this.getValue("CANBusStatus");
            if(value === "OK")
                $("#robotCANStatus").html("CAN Status:<span class='green'>OK</span>");
            else
                $("#robotCANStatus").html(`CAN Status:<span class='blinkRed'>${value}</span>`);
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

    putValue(nm, value)
    {
        if(nm == undefined)
        {
            this.error("bad putvalue");
        }
        else
        {
            if(nm[0] == '/')
                NetworkTables.putValue(nm, value);
            else
            if(this.config.netTabVersion <= 1801)
            {
                // for 18.0.1 
                NetworkTables.putValue("SmartDashboard/"+nm, value);
            }
            else
            {
                // for 18.0.2
                NetworkTables.putValue("/SmartDashboard/"+nm, value);
            }
        }
    }

    getValue(nm, def="")
    {
        if(nm[0] == '/')
            return NetworkTables.getValue(nm, def);
        else
            return NetworkTables.getValue("/SmartDashboard/"+nm, def);
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
        this.debug("nettab entry changed: " + key +
                  " = " + value +
                 " new: " + isNew);
        
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
        default:
            break;
        }

        if(!this.pageHandlers[this.currentPage]) 
        {
            this.debug("onNetTabChange: missing page handler for " + this.currentPage);
            return;
        }
        // Currently we only distribute changes to current page.
        // This means that any history is lost for non-visible changes.
        // On the other hand, we don't waste cycles and memory on history
        // that the user may not care about.
        if(this.pageHandlers[this.currentPage].onNetTabChange)
        {
            this.pageHandlers[this.currentPage].onNetTabChange(key, value, isNew);
        }
    }

    // ajax utils -------------------------------------------------------------
    sendGetRequest(url, responseHandler)
    {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            this.handleResponse(req, responseHandler, false);
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
                responseHandler(JSON.parse(request.responseText));
            }
            else
            {
                responseHandler(request.responseText);
            }
        }
    }

    // from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    storageAvailable(type)
    {
        try 
        {
            var storage = window[type], x = "__storage_test__";
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch(e) 
        {
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
window.app.notice("Dashboard loaded");
