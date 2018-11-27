/* global Widget, $, app */
class CamerasWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
    }    
    
    getHiddenNTKeys()
    {
        return null;
    }

    valueChanged(key, value, isNew)
    {
        switch(key)
        {
        default:
            break;
        }
    }

    addRandomPt()
    {
        // no-op
    }
}

Widget.AddWidgetClass("cameras", CamerasWidget);