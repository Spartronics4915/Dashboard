/* global app */
// Widget describes the required interface for all widgets.
// It also offers methods useful to subclasses.
class Widget
{
    constructor(config, targetElem)
    {
        this.config = config;
        if(this.config.ntkeys && !Array.isArray(this.config.ntkeys))
            this.config.ntkeys = [this.config.ntkeys];
        this.targetElem = targetElem;
    }

    ntkeyToDOMId(key)
    {
        // HTML5 allows any character except any type of space character.
        let keys = key.split("/"); // expect ['', SmartDashboard, Subsys, Key]
        let label = (keys[2] == this.subsys) ? keys[3] : (keys[2]+" "+keys[3]);
        let id = this.subsys + keys[3];
        if(id.indexOf(" "))
            app.warning("DOM id botch for "  + key);
        return [label, id];
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