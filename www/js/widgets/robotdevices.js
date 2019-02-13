/* global app, $, Widget */

class RobotDevicesWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem);
        let w = this.config;
        let html = "<div class='containerrow'>";
        html +=     `<span class='title'>${this.config.label}</span>`;
        html +=   "</div>";
        html +=        "<table id='devicetable' border='0'>";
        html +=          "<tbody>";
        html +=         "</tbody>";
        html +=       "</table>";
        html += "<hr/>";
        targetElem.html(html);
        this.pageHandler = pageHandler;
        this.testData = [
            {
                "BootloaderRev": "0.2",
                "CurrentVers": "4.1",
                "DynID": 17102859,
                "HardwareRev": "1.0",
                "ID": 17103872,
                "ManDate": "Nov 19, 2017",
                "Model": "Victor SPX",
                "Name": "Victor 0 - Left",
                "SoftStatus": "Running Application",
                "UniqID": 5,
                "Vendor": "VEX Robotics"
            },
            {
                "BootloaderRev": "2.6",
                "CurrentVers": "4.1",
                "DynID": 33880073,
                "HardwareRev": "1.4",
                "ID": 33881088,
                "ManDate": "Nov 3, 2014",
                "Model": "Talon SPX",
                "Name": "Victor 0 - Right",
                "SoftStatus": "Running Application",
                "UniqID": 4,
                "Vendor": "Cross The Road Electronics"
            },
            {
                "BootloaderRev": "2.6",
                "CurrentVers": "4.1",
                "DynID": 33880071,
                "HardwareRev": "1.4",
                "ID": 33881089,
                "ManDate": "Nov 3, 2014",
                "Model": "Talon SRX",
                "Name": "Talon 1 - Left",
                "SoftStatus": "Running Application",
                "UniqID": 6,
                "Vendor": "Cross The Road Electronics"
            }
        ];

        this._buildDeviceList();
    }

    valueChanged(key, value, isNew)
    {
        // no-op, managed explicitly by our pagehandler
        this._buildDeviceList();
    }

    addRandomPt()
    {
        // no-op, managed explicitly by our pagehandler
    }

    _buildDeviceList()
    {
        let devArray = app.getRobotDeviceArray();
        if(!devArray && true)
            devArray = this.testData;
        $("#devicetable tbody > tr").remove();

        // order of fields in Tuner:
        //  Devices, Software Status, Hardware, ID, Firmware Version,
        //  Manufacturer Date, Bootloader Rev, Hardware Version, Vendor
        // Data available: (via CTRE.Phoenix.Diagnostics/JSON/Serializers.cs)
        /*
           {
                public string BootloaderRev;
                public string CurrentVers;
                public int? DynID;
                public string HardwareRev;
                public string Vendor;
                public long? ID;
                public string ManDate;
                public string Model;
                public string Name;
                public string SoftStatus;
                public int? UniqID;
            }
        */
        let tr = $("<tr></tr>").appendTo($("#devicetable > tbody:last"));

        let cols = ["ID:Device Name", "Firmware", "Manufacture Date",
                    "Bootloader", "Hardware", "DynID", "ID", "Status"];
        for(let nm of cols)
        {
            $("<td></td>").html(`<span class='lessblue'>${nm}</span>`).appendTo(tr);
        }
        if(!devArray)
        {
            tr = $("<tr></tr>").appendTo($("#devicetable > tbody:last"));
            $("<td colspan='5'></td>").html(
                "<span class='amber'>no devices available...</span>").appendTo(tr);
        }
        else
        {
            // we can also change things via http
            // https://github.com/CrossTheRoadElec/Phoenix-diagnostics-client
            //
            // http://<address>:<port>/?device=<model>&id=<id>&action=<action>&<furtherArgs>
            //  model: [srx,spx,canif,pigeon,ribbonPigeon,pcm,pdp]
            //  action: [getversion,getdevices,blink,setid,selftest,fieldupgrade,progress,getconfig,setconfig]
            //      setid (newid=)
            //      setname (newname=)
            for(let dev of devArray)
            {
                // DeviceName/ID
                tr = $("<tr></tr>").appendTo($("#devicetable > tbody:last"));
                $("<td></td>").text(dev.UniqID+":"+dev.Name).appendTo(tr);

                // Firmware Vers
                $("<td></td>").text(dev.CurrentVers).appendTo(tr);

                // Manufacture Date
                $("<td></td>").text(dev.ManDate).appendTo(tr);

                // Bootloader Vers
                $("<td></td>").text(dev.BootloaderRev).appendTo(tr);

                // Hardware Vers
                $("<td></td>").text(dev.HardwareRev).appendTo(tr);

                // DynID
                $("<td></td>").text("0x" + Number(dev.DynID).toString(16)).appendTo(tr);

                // ID
                $("<td></td>").text("0x" + Number(dev.ID).toString(16)).appendTo(tr);

                // Status
                $("<td></td>").text(dev.SoftStatus).appendTo(tr);
            }
        }
    }
}

Widget.AddWidgetClass("robotdevices", RobotDevicesWidget);