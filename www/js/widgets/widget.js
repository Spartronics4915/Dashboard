/* global app */
// Widget describes the required interface for
// all widgets.
class Widget
{
    constructor(config, targetElem)
    {
        this.config = config;
        this.targetElem = targetElem;
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
window.Widget = Widget;