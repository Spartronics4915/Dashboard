//
// javascript page handler for nettab.html
//
(function(global) {
'use strict';
var ntfilter = "";
var nettab = {
    pageLoaded: function(targetElem, html) {
        var self = this;
        targetElem.innerHTML = html;
        $("#ntfilter").on("input", function() {
            ntfilter = $(this).val();
            self.rebuildNetTab();
        });
        this.rebuildNetTab();
    },

    // rebuildNetTab: triggers callback to app, which distributes
    //  the event to all nt listeners, including ourselves.
    rebuildNetTab: function() {
        this.clearDisplay();
        var keys = NetworkTables.getKeys();
        for(var i=0;i<keys.length; i++)
        {
            var key = keys[i];
            app.onNetTabChange(key, NetworkTables.getValue(key), true);
        }
    },

    onNetTabConnect: function() {
        this.clearDisplay();
    },

    clearDisplay: function() {
        $("#networktable tbody > tr").remove();
    },

    onNetTabChange: function(key, value, isNew) {
        // key thing here: we're using the various NetworkTable keys as
        // the id of the elements that we're appending, for simplicity. However,
        // the key names aren't always valid HTML identifiers, so we use
        // the NetworkTables.keyToId() function to convert them appropriately
        if(ntfilter && -1 === key.indexOf(ntfilter)) return;
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

};

global.app.setPageHandler("nettab", nettab);

})(window);
