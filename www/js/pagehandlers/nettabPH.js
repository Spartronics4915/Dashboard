/* global PageHandler, $, NetworkTables, app */
// javascript page handler for nettab.html

class NetTabPH extends PageHandler
{
    constructor(config, pageTemplate)
    {
        super(config, pageTemplate);
        this.ntfilter = "";
    }

    pageLoaded(targetElem, html)
    {
        targetElem.innerHTML = html;
        $("#ntfilter").val(this.ntfilter);
        $("#ntfilter").on("input", function() {
            this.ntfilter = $(this).val();
            this.rebuildNetTab();
        }.bind(this));
    }

    // rebuildNetTab: triggers callback to app, which distributes
    //  the event to all nt listeners, including ourselves.
    rebuildNetTab() 
    {
        this.clearDisplay();
        app.replayNetTab();
    }

    onNetTabConnect()
    {
        this.clearDisplay();
    }

    clearDisplay() 
    {
        $("#networktable tbody > tr").remove();
    }

    onNetTabChange(key, value, isNew) 
    {
        // key thing here: we're using the various NetworkTable keys as
        // the id of the elements that we're appending, for simplicity. However,
        // the key names aren't always valid HTML identifiers, so we use
        // the NetworkTables.keyToId() function to convert them appropriately
        if(this.ntfilter && -1 === key.indexOf(this.ntfilter)) return;
        if (isNew)
        {
            var tr = $("<tr></tr>").appendTo($("#networktable > tbody:last"));
            $("<td></td>").text(key).appendTo(tr);
            $("<td></td>").attr("id", NetworkTables.keyToId(key))
                           .text(value)
                           .appendTo(tr);
        }
        else
        {
            // similarly, use keySelector to convert the key to a valid jQuery
            // selector. This should work for class names also, not just for ids
            $("#" + NetworkTables.keySelector(key)).text(value);
        }
    }
}

window.NetTabPH = NetTabPH;
