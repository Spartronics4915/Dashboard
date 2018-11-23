/* global app */
// Widget describes the required interface for
// all widgets.
class Widget
{
    constructor(config)
    {
        this.config = config;
    }

    addRandomPt()
    {
        app.notice("addRandomPt: override me");
    }

    valueChanged(key, value, isNew)
    {
        app.notice("valueChanged: override me");
    }

}
window.Widget = Widget;