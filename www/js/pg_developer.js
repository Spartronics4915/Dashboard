//
// javascript page handler for about.html
//
(function(global) {
'use strict';
var developer = {
    randomData: [],

    pageLoaded: function(targetElem, html) {
        var self = this;
        var map = {
            loglevels:  "<option>DEBUG</option>"+
                        "<option>INFO</option>"+
                        "<option>NOTICE</option>"+
                        "<option>WARNING</option>"+
                        "<option>ERROR</option>",
        };
        targetElem.innerHTML = app.interpolate(html, map);

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key;
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

        // build string.
        var val = NetworkTables.getValue("/SmartDashboard/Build", "n/a");
        $(".buildid").text("Robot sw build: " + val);

        // dabble wth flot
        var plot = $.plot("#randomPlot", [this.getRandomData()], {
                series: {
                    shadowSize: 0
                },
                yaxis: {
                    min: 0,
                    max: 100
                },
                xaxis: {
                    show: false
                }
        });
        function update() {
            plot.setData([self.getRandomData()]);
            plot.draw();
            setTimeout(update, 30);
        }
        update();

        // dabble with justgage...
        this.imuHeadingGage = new JustGage({
            id: "imuHeadingGage",
            value: 67,
            min: -180,
            max: 180,
            title: "IMU Heading",
            valueFontColor: "#888",
          });
        if(0) {
            var changeGage = function() {
                var val = Math.floor(Math.random() * 360 - 180);
                self.imuHeadingGage.refresh(val);
                window.setTimeout(changeGage, 2000);
            }
            changeGage();
        }
    },

    onNetTabChange: function(key, value, isNew) {
        if(key === "/SmartDashboard/Drivetrain_IMU_Heading")
        {
            self.imuHeadingGage.refresh(Number(value));
        }
    },

    getRandomData: function() {
        if(this.randomData.length > 0)
        {
            this.randomData = this.randomData.slice(1);
        }
        while(this.randomData.length < 300)
        {
            var prev = this.randomData.length > 0 ?
                        this.randomData[this.randomData.length-1] : 50;
            var y = prev + Math.random() * 10 - 5;
            if(y < 0)
            {
                y = 0;
            }
            else
            if(y > 100)
            {
                y = 100;
            }
            this.randomData.push(y);
        }
        // Zip the generated y values with the x values
        var res = [];
        for(var i=0; i<this.randomData.length; i++)
        {
            res.push([i, this.randomData[i]]);
        }
        return res;
    }
};
global.app.setPageHandler("developer", developer);
})(window);
