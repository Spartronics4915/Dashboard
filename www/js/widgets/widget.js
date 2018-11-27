/* global app */
// Widget describes the required interface for all widgets.
// It also offers methods useful to subclasses.

s_widgetFactory = {};

class Widget
{
    constructor(config, targetElem)
    {
        this.config = config;
        if(this.config.ntkeys && !Array.isArray(this.config.ntkeys))
            this.config.ntkeys = [this.config.ntkeys];
        this.targetElem = targetElem;
    }

    static AddWidgetClass(name, classObj)
    {
        if(s_widgetFactory[name])
            app.warning("widget factory collision for " + name);
        s_widgetFactory[name] = classObj;
    }

    static BuildWidgetByName(name, config, targetElem, pageHandler)
    {
        let c = s_widgetFactory[name];
        if(c)
            return new c(config, targetElem, pageHandler);
        else
            return undefined;
    }

    // shared mechanism to equate domid with nettab key, also
    // useful to create a label. HTML5 allows any character 
    // except any type of space character.
    ntkeyToDOMId(key)
    {
        return key.replace(/ /g, "__");
    }

    domIdToNTkey(id)
    {
        return id.replace(/__/g, " ");
    }

    // shared mechanism to convert ntkey to label,  if subsysCtx
    // matches the incoming value, it's not part of the label.
    ntkeyToLabel(key, subsysCtx)
    {
        let keys = key.split("/"); // expect ['', SmartDashboard, Subsys, Key]
        return (keys[2] == subsysCtx) ? keys[3] : (keys[2]+" "+keys[3]);
    }

    // required/advised overrides ------------------------------------------
    getHiddenNTKeys()
    {
        // useful for macro-widgets (eg fieldconfig)
        return null;
    }

    valueChanged(key, value, isNew)
    {
        app.notice(`${this.config.label} valueChanged: override me!`);
    }

    addRandomPt()
    {
        app.notice(`${this.config.label} addRandomPt: override me!`);
    }
}

Widget.AddWidgetClass("widget", Widget);