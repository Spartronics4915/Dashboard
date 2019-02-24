/* global Widget, CanvasUtils */

class ImgWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = {
            url: "/images/404.jpg",
            cls: ""
        };
        this.params = Object.assign(this.params, this.config.params);

        this.targetId = targetElem.attr("id");
        this.imgId = `${this.config.id}Img`;
        let html = `<img id='${this.imgId}' src='${this.params.url}' ` +
                   ` class='${this.params.cls}'</img>`;
        targetElem.html(html);
        this.imgEl = document.getElementById(this.imgId);
        this.imgEl.addEventListener("load", this._onLoad.bind(this));
    }

    valueChanged(key, value, isNew)
    {
        // could support a url here.
    }

    addRandomPt()
    {
    }

    _onLoad()
    {
        if(this.params.overlayId)
        {
            let canvEl = document.getElementById(this.params.overlayId);
            if(canvEl)
                CanvasUtils.placeCanvasOver(canvEl, this.imgEl);
        }
    }
}

Widget.AddWidgetClass("img", ImgWidget);
