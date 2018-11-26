class CamerasWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
    }
}

Widget.AddWidgetClass("cameras", CamerasWidget);