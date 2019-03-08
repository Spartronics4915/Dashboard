/* global Widget, app, cv */
class CanvasWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.targetElem = targetElem;
        if(!this.config.params) this.config.params = {};

        this.canvId = this.config.id+"Canv"; // NB: others may refer to us (careful)
        this.canvasEl = null;
        if(!this.config.params.canvcls)
            this.config.params.canvcls = "nopointer";

        let html = "";
        html += `<canvas id='${this.canvId}' class='${this.config.params.canvcls}'></canvas>`;
        this.targetElem.html(html);
        this.canvasEl = document.getElementById(this.canvId);
        this.canvasCtx = this.canvasEl.getContext("2d");
        this.resizeListener = null;

        if(this.config.params.overlay && this.config.params.overlay.enable)
        {
            this.overlay = this.config.params.overlay;
            // we rely on our sibling/underlay to cause us to be
            // overlayed (may not know size 'til eg image loads)
            if(this.overlay.updateinterval)
            {
                app.registerPageIdler(this.onIdle.bind(this),
                        this.overlay.updateinterval,
                        "canvas");
            }
        }
        this.canvasEl.onmousemove = this._onMouseMove.bind(this);

        // TODO: for opencv of other img or video src, we need its element id
    }

    cleanup()
    {
        if(this.resizeListener)
        {
            window.removeEventListener("resize", this.resizeListener);
            this.resizeListener = null;
        }
        if(this.config.params.overlay)
        {
            for(let item of this.config.params.overlay.items)
            {
                // cleanup items ref to per-item-class dynamic data
                if(item._data != undefined)
                    item._data = null;
            }
        }
    }

    placeOver(targetEl)
    {
        if(this.underlayEl != targetEl)
        {
            this.resizeListener = function() {
                // app.info("on resize " + this.canvId);
                CanvasWidget.placeCanvasOver(this.canvasEl, targetEl);
                this._updateOverlay();
            }.bind(this);
            window.addEventListener("resize", this.resizeListener);
        }
        CanvasWidget.placeCanvasOver(this.canvasEl, targetEl);
        this._updateOverlay();
    }

    getHiddenNTKeys()
    {
        // Always expose our enabled hidden nt keys since this is only
        // called during page-load and a camera-switch may occur that
        // changes the overlay enabled state. Overlay items may listen
        // on the same key and we don't redundant updates.
        let hiddenMap = {};
        if(this.config.params.overlay && this.config.params.overlay.enable)
        {
            for(let item of this.config.params.overlay.items)
            {
                if((item.enable === undefined || item.enable) && item.key)
                    hiddenMap[item.key] = true;
            }
        }
        return Object.keys(hiddenMap);
    }

    onIdle()
    {
        if(this.config.params.overlay  && this.config.params.overlay.enable)
        {
            this._updateOverlay();
        }
    }

    valueChanged(key, value, isNew)
    {
        this._updateOverlay(key, value, isNew);
    }


    _onMouseMove(evt)
    {
        if(this.config.params.overlay)
        {
            for(let item of this.config.params.overlay.items)
            {
                if(item.pointerevents)
                {
                    switch(item.class)
                    {
                    case "poselist":
                        this._drawPoselist(item, evt);
                        break;
                    case "path":
                        this._drawPath(item, evt);
                        break;
                    default:
                        app.warning("canvas: unexpected item requested pointereverts");
                        break;
                    }
                }
            }
        }
    }

    _evtToCanvasCoords(evt)
    {
        let r = this.canvasEl.getBoundingClientRect();
        return [evt.clientX - r.left, evt.clientY - r.top];
    }
    // _updateOverlay should be called on any nettab change whether
    //  overlays are enabled or not. This allows us to keep the
    //  correct values in place should a camera-switch occur that
    //  requests overlays.  For time updates that don't involve
    //  network table traffic, our onIdle method is invoked via
    //  the "page idler" mechanism of app.
    //  NB: key may be null as on idle events, etc.
    _updateOverlay(key, value, isNew)
    {
        // always update overlay values to avoid missing nettab event
        if(!this.config.params.overlay || !this.config.params.overlay.enable)
            return;

        var w = this.canvasEl.getAttribute("width");
        var h = this.canvasEl.getAttribute("height");

        // first we update the value of any/all items, that care
        // about key. If one or more opencv items changes, we nominate
        // one for the (expensive) computation. (Generally two opencv
        // items don't listen on the same key).
        let opencvItem = null;
        for(let item of this.config.params.overlay.items)
        {
            if(item.enable == undefined || item.enable)
            {
                // key may be undefined
                if(app.ntkeyCompare(key,item.key))
                {
                    item.value = value;
                    if(!opencvItem && item.class == "opencv")
                    {
                        // only one opencv item per iteration (per key)
                        opencvItem = item;
                    }
                }
            }
        }
        if(opencvItem && opencvItem.enable)
            this._updateOpenCV(opencvItem, w, h);

        // good to go
        app.debug("drawOverlay");
        this.canvasCtx.clearRect(0, 0, w, h);
        // see also: https://www.google.com/search?q=spaceship+docking+hud
        for(let item of this.config.params.overlay.items)
        {
            if(!item.enable) continue;
            if(item.subclass)
            {
                switch(item.subclass)
                {
                case "time":
                    if(item.value == undefined || item.value == "" || !app.robotConnected)
                        item.value = new Date().toLocaleTimeString();
                    // else we're presumably listening on a nettab value
                    // and will receive an update.
                    break;
                case "cameraname":
                    item.value = this.cameraName;
                    break;
                }
            }
            switch(item.class)
            {
            case "poselist":
                this._drawPoselist(item);
                break;
            case "path":
                this._drawPath(item);
                break;
            case "time":
                if(item.value == undefined || item.value == "" || !app.robotConnected)
                    item.value = new Date().toLocaleTimeString();
                // else we're presumably listening on a nettab value
                // and will receive an update.
                // fall through
            case "text":
                // if(0)
                {
                    this.canvasCtx.save();
                    this.canvasCtx.fillStyle = item.fillStyle;
                    this.canvasCtx.font = item.font;
                    this.canvasCtx.shadowColor =  "rgba(0,0,0,.8)";
                    this.canvasCtx.shadowOffsetX = 3;
                    this.canvasCtx.shadowOffsetY = 3;
                    this.canvasCtx.shadowBlur = 3;
                    this.canvasCtx.fillText(item.value ? item.value : "<no label>",
                                item.origin[0], item.origin[1]);
                    this.canvasCtx.restore();
                }
                break;
            case "crosshairs":
                {
                    let centerX = w / 2;
                    this.canvasCtx.save();
                    this.canvasCtx.shadowColor = item.color2;
                    this.canvasCtx.shadowOffsetX = 0;
                    this.canvasCtx.shadowOffsetY = 0;
                    this.canvasCtx.shadowBlur = 8;

                    this.canvasCtx.strokeStyle = item.color1;
                    this.canvasCtx.lineWidth = item.lineWidth;
                    this.canvasCtx.beginPath();
                    this.canvasCtx.moveTo(centerX, 0);
                    this.canvasCtx.lineTo(centerX, h);
                    this.canvasCtx.stroke();
                    if(false)
                    {
                        // just use shadow
                        this.canvasCtx.beginPath();
                        this.canvasCtx.strokeStyle = item.color2;
                        this.canvasCtx.moveTo(centerX - item.lineWidth, 0);
                        this.canvasCtx.lineTo(centerX - item.lineWidth, h);
                        this.canvasCtx.moveTo(centerX + item.lineWidth, 0);
                        this.canvasCtx.lineTo(centerX + item.lineWidth, h);
                        this.canvasCtx.stroke();
                    }
                    this.canvasCtx.restore();
                }
                break;
            case "lineargauge":
                {
                    let ctx = this.canvasCtx;
                    ctx.save();
                    // first draw background
                    let x0 = item.origin[0]; 
                    let y0 = item.origin[1];
                    let xsz = item.size[0];
                    let ysz = item.size[1];
                    let x1, y1, crad = 5;
                    if(xsz > ysz)
                    {
                        // horizontal
                        x1 = x0 + xsz;
                        y1 = y0;
                    }
                    else
                    {
                        x1 = 0;
                        y1 = y0 + ysz;
                    }
                    ctx.fillStyle = item.bgColor;
                    CanvasWidget.roundRect(ctx, x0, y0, 
                                            item.size[0], item.size[1],
                                            crad, true, true);
                    if(item.fgColors)
                    {
                        let grad = ctx.createLinearGradient(x0, y0, x1, y1);
                        for(let stop of item.fgColors)
                        {
                            let pct = (stop[0] - item.range[0]) / 
                                    (item.range[1] - item.range[0]);
                            grad.addColorStop(pct, stop[1]);
                        }
                        ctx.fillStyle = grad;
                    }
                    else
                        ctx.fillStyle = item.fgColor;

                    let valPct = (item.value - item.range[0]) / 
                                (item.range[1] - item.range[0]);
                    let ino = 3; 
                    let insz = 2*ino;
                    if(xsz > ysz)
                    {
                        CanvasWidget.roundRect(ctx, x0+ino, y0+ino, 
                                            valPct*item.size[0]-insz, 
                                            item.size[1]-insz,
                                            crad, true, true);
                    }
                    else
                    {
                        CanvasWidget.roundRect(ctx, x0+ino, y0+ino, 
                                            item.size[0]-insz, 
                                            valPct*item.size[1]-insz,
                                            crad, true, true);
                    }
                    if(item.label)
                    {
                        ctx.fillStyle = item.label.fillStyle;
                        ctx.font = item.label.font;
                        ctx.shadowColor =  "rgba(0,0,0,.8)";
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 2;
                        ctx.shadowBlur = 1;
                        let txt = app.interpolate(item.label.text, {
                                                    value: item.value
                                                });
                        ctx.fillText(txt, 
                                x0 + item.label.offset[0], 
                                y0 + item.label.offset[1]);
                    }
                    ctx.restore();
                }
                break;
            case "radialgauge":
                {
                    let label = item.key;
                    let ctx = this.canvasCtx;
                    ctx.save();
                    // we'll draw a half circle, so radius is ysize
                    let radius = item.size[1] - .5 * item.width;
                    let cx = item.origin[0] + item.size[0]/2;
                    let cy = item.origin[1] + item.size[1];

                    // first draw background
                    ctx.lineCap = "round";
                    ctx.lineWidth = item.width;
                    ctx.strokeStyle = item.bgColor;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, -Math.PI, 0);
                    ctx.stroke();

                    // next fgd value
                    ctx.lineCap = "butt";
                    let pct = (item.value - item.range[0]) / 
                                (item.range[1] - item.range[0]);
                    ctx.lineWidth = .8*item.width;
                    // radial gradient can be used to give 3d effect
                    let gradient = ctx.createRadialGradient(
                                        cx, cy, radius - item.width,
                                        cx, cy, radius + item.width);
                    gradient.addColorStop(0, item.bgColor);
                    gradient.addColorStop(0.5, item.fgColor);
                    gradient.addColorStop(1.0, item.bgColor);
                    ctx.strokeStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, -Math.PI, -Math.PI+pct*Math.PI);
                    ctx.stroke();

                    // to-do: add label, color change is a little tricky
                    ctx.restore();
                }
                break;
            case "circle":
                // expect value string "x, y, r [, strokewidth]"
                // for multiple circles, we currently require multiples-of-4
                // if(0)
                {
                    let vals = item.value.split(",");
                    if(vals.length >= 3)
                    {
                        let stroke = false;
                        let fill = false;
                        this.canvasCtx.save();
                        if(item.fillStyle)
                        {
                            this.canvasCtx.fillStyle = item.fillStyle;
                            fill = true;
                        }
                        if(item.strokeStyle)
                        {
                            this.canvasCtx.strokeStyle = item.strokeStyle;
                            stroke = true;
                        }
                        this.canvasCtx.lineWidth = 2;
                        for(let i=0;i<vals.length;i+=4)
                        {
                            if(i+3<vals.length)
                                this.canvasCtx.lineWidth = vals[i+3];
                            CanvasWidget.circle(this.canvasCtx,
                                                vals[i], vals[i+1], vals[i+2],
                                                stroke, fill);
                        }
                        this.canvasCtx.restore();
                    }
                }
                break;
            case "rect":
                // expect value string "x0, y0, width, height, [cornerradius [, strokewidth]]"
                // if(0)
                {
                    let vals = item.value.split(",");
                    if(vals.length >= 4)
                    {
                        let stroke = false;
                        let fill = false;
                        this.overlayCtx.save();
                        if(item.fillStyle)
                        {
                            this.overlayCtx.fillStyle = item.fillStyle;
                            fill = true;
                        }
                        if(item.strokeStyle)
                        {
                            this.overlayCtx.strokeStyle = item.strokeStyle;
                            stroke = true;
                        }
                        this.overlayCtx.lineWidth = (vals.length >= 6) ? vals[5]:3;
                        CanvasWidget.roundRect(this.canvasCtx,
                                            vals[0], vals[1], vals[2], vals[3],
                                            (vals.length >= 5) ? vals[4] : 0, // radius
                                            stroke, fill);
                        this.canvasCtx.restore();
                    }
                }
                break;
            case "opencv":
                {
                    if(item._data)
                    {
                        this.canvasCtx.save();
                        this.canvasCtx.globalCompositeOperation = "destination-over";
                        this.canvasCtx.putImageData(item._data, 0, 0);
                        // this.overlayCtx.drawImage(item._data, 0, 0);
                        this.canvasCtx.restore();
                    }
                }
                break;
            }
        }
    }

    _updateOpenCV(updateItem, w, h)
    {
        if(!app.opencv || !app.opencv.loaded)
            app.debug("cv not loaded yet");
        else
        {
            if(!this.opencvEl)
            {
                // In order to apply opencv, we must allocate a canvas
                // and populate it with pixels from the video.  This canvas
                // is invisible to users.
                this.opencvEl = document.createElement("canvas");
                this.opencvEl.width = w; // w, h are size of overlay
                this.opencvEl.height = h;
                // this.opencvEl.style.position = "absolute";
                this.opencvEl.style.display = "none";
                this.targetElem[0].appendChild(this.opencvEl);
                this.opencvCtx = this.opencvEl.getContext("2d");
            }
            if(this.vidEl)
            {
                // this.vidEl.visibility = "hidden";
                this.opencvCtx.drawImage(this.vidEl, 0, 0, w, h);
            }
            else
            if(this.imgEl)
            {
                // this.imgEl.visibility = "hidden";
                this.opencvCtx.drawImage(this.imgEl, 0, 0, w, h);
            }
            else
            {
                app.warning("opencv has nothing to do");
            }
            // process the image
            // http://ucisysarch.github.io/opencvjs/examples/img_proc.html
            var input = this.opencvCtx.getImageData(0, 0, w, h);
            var src = cv.matFromArray(input.height, input.width, cv.CV_8UC4,
                                    input.data); // canvas holds rgba
            cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
            switch(updateItem.pipeline)
            {
            case "blur":
                {
                    let output = new cv.Mat();
                    cv.blur(src, output, [10, 10], [-1, -1], 4);
                    cv.flip(output, output, -1);
                    updateItem._data = this._getImgData(output, 128);
                    output.delete();
                }
                break;
            case "canny":
                {
                    let output = new cv.Mat();
                    let blurred = null; // new cv.Mat();
                    let cthresh = 50; // higher means fewer edges
                    let cc = [100, 0, 200];
                    if(blurred)
                    {
                        cv.blur(src, blurred, [5, 5], [-1, -1], 4);
                        cv.Canny(blurred, output, cthresh, cthresh*2, 3, 0);
                    }
                    else
                        cv.Canny(src, output, cthresh, cthresh*2, 3, 0);
                    updateItem._data = this._getImgData(output, 0, cc);
                    if(blurred)
                        blurred.delete();
                    output.delete();
                }
                break;
            default:
                app.warning("unimplemented opencv pipeline " + updateItem.pipeline);
                break;
            }
            src.delete();
        }
    }

    _canvasToFieldCoords(coords)
    {
        // 0-cwidth -> 0->684
        // 0->cheight =>  171->-171 (flipY)
        let x = 684 * (coords[0] / this.canvasEl.width);
        let y = 171 - 342 * (coords[1] / this.canvasEl.height);
        app.putValue("Paths/Coords", `${x.toFixed(1)} ${y.toFixed(1)}`);
        return [x, y];
    }

    _drawFieldBegin()
    {
        // paths and poses
        // FRC field is 684 x 342, we assume we have the
        // correct aspect ratio. We assume field poses have
        // an origin at the midpoint and y is up.
        let ctx = this.canvasCtx;
        let width = this.canvasEl.width;
        let height = this.canvasEl.height;
        let sx = width/684;
        let sy = -height/342; // flip y
        ctx.save();
        // origin x is "left"
        // origin y is middle
        ctx.translate(0, height*.5);
        ctx.scale(sx, sy);
        return ctx;
    }

    _drawFieldEnd()
    {
        this.canvasCtx.restore();
    }

    _drawPoselist(item, evt)
    {
        // A poselist is assumed to accumulate over the course of
        // a competition.  We rely on the app to store our list
        // and assume it's categorized according to game phase.
        // We draw the newest pose in our bright color, older
        // poses are darker. We rely on app to manage the memory
        // of the poselists, perhaps filtering them according to
        // a minimum distance and/or time difference.
        // FRC field is 684 x 342, we assume we have the
        // correct aspect ratio. We assume field poses have
        // an origin at the midpoint and y is up.
        let poselists = app.getRobotState().getPoseLists();

        if(evt != undefined)
        {
            // this is a mouse/hover event
            return;
        }

        let ctx = this._drawFieldBegin();
        // assume: one stroke style
        if(item.strokeStyle)
            ctx.strokeStyle = item.strokeStyle;

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.shadowColor =  "rgba(0,0,0,.8)";
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.shadowBlur = 3;
        for(let key of app.getRobotState().getPoseListKeys())
        {
            // assume: one fill style per game-phase
            if(item.fillStyle[key])
                ctx.fillStyle = item.fillStyle[key];
            let poselist = poselists[key];
            for(let i=0;i<poselist.length;i++)
            {
                const pose = poselist[i];
                // pose is x, y (inches), cosangle, sinangle
                const x = pose[0];
                const y = pose[1];
                // const rads = pose[2];
                const cos = pose[3];
                const sin = pose[4];
                ctx.beginPath();
                ctx.arc(x, y, 3/*radius inches*/, 0, 2*Math.PI); // ends path
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(x,y);
                ctx.lineTo(x + cos*8, y + sin*8);
                ctx.stroke();
            }
        }
        this._drawFieldEnd();
    }

    _drawPath(item, evt)
    {
        // modes:
        //      waypoints only (x,y,theta)
        //      full path as used by robot
        //      spline prior to curvature optimization
        //      spline after currvature optimization
        //      time-constrained spline:
        //          color-coding velocity
        //          color-coding curvature
        let coords = null;
        if(evt != undefined)
        {
            // has the side-effect of printing canvas coords
            coords = this._evtToCanvasCoords(evt);
            coords = this._canvasToFieldCoords(coords);
        }
        if(!item.value) return;
        let repo = app.getPathsRepo();
        if(repo)
        {
            let path = repo.getPath(item.value);
            if(path != null)
            {
                if(evt != undefined)
                {
                    let p = path.intersect(item.config.mode, coords[0], coords[1]);
                    if(p)
                        app.putValue("Paths/Details", p.asDetails());
                    else
                        app.putValue("Paths/Details", "n/a");
                }
                else
                {
                    let ctx = this._drawFieldBegin();
                    if(!item.config.mode)
                        item.config.mode = "waypoints";
                    path.draw(ctx, item.config.mode, item.config.color);
                    this._drawFieldEnd();
                }
            }
            else
                app.warning("missing path " + item.value);
        }
    }

    addRandomPt()
    {
        if(!this.config.params.overlay || !this.config.params.overlay.enable)
            return;
        // distribute random to each overlay item?
    }

    // convert from opencv to canvas img data
    // see: https://docs.opencv.org/3.4/de/d06/tutorial_js_basic_ops.html
    _getImgData(cvMat, maxOpac, colorize)
    {
        var type = cvMat.type();
        if(type != cv.CV_8U)
        {
            app.error("invalid opencv type:" + type);
            return null;
        }
        var cont = cvMat.isContinuous();
        if(!cont)
        {
            app.error("opencv mat expected to be continous");
            return null;
        }
        var nchan = cvMat.channels();
        var imgdata = this.opencvCtx.createImageData(cvMat.cols, cvMat.rows);
        var idata = imgdata.data;
        var cvdata = cvMat.data;
        if(nchan == 1)
        {
            if(!colorize)
            {
                for(let i=0,j=0;i<idata.length;i+=nchan)
                {
                    let d = cvdata[i];
                    idata[j++] = d;
                    idata[j++] = d;
                    idata[j++] = d;
                    imgdata.data[j++] = maxOpac > 0 ? maxOpac : (d ? 255 : 0);
                }
            }
            else
            {
                for(let i=0,j=0;i<idata.length;i+=nchan)
                {
                    let d = cvdata[i];
                    idata[j++] = Math.floor(colorize[0]*d / 255);
                    idata[j++] = Math.floor(colorize[1]*d / 255);
                    idata[j++] = Math.floor(colorize[2]*d / 255);
                    imgdata.data[j++] = maxOpac > 0 ? maxOpac : (d ? 255 : 0);
                }
            }
        }
        else
        if(nchan == 3 || nchan == 4)
        {
            for(let i=0,j=0;i<idata.length;i+=nchan)
            {
                idata[j++] = cvdata[i]; // j % 255;
                idata[j++] = cvdata[i+1];
                idata[j++] = cvdata[i+2];
                imgdata.data[j++] = maxOpac;
            }
        }
        else
            app.error("unexpected opencv mat.nchan " + nchan);
        return imgdata;
    }

    static placeCanvasOver(canvEl, targetEl)
    {
        // control pointerevents by canvcls
        canvEl.style.position = "absolute";
        canvEl.style.left = targetEl.offsetLeft + "px";
        canvEl.style.top = targetEl.offsetTop + "px";
        canvEl.setAttribute("width", targetEl.offsetWidth);
        canvEl.setAttribute("height", targetEl.offsetHeight);
    }

    /**
     * Draws a rounded rectangle using the current state of the canvas.
     * If you omit the last three params, it will draw a rectangle
     * outline with a 5 pixel border radius
     * @param {CanvasRenderingContext2D} ctx
     * @param {Number} x The top left x coordinate
     * @param {Number} y The top left y coordinate
     * @param {Number} width The width of the rectangle
     * @param {Number} height The height of the rectangle
     * @param {Number} radius The corner radius. Defaults to 5;
     * @param {Boolean} fill Whether to fill the rectangle. Defaults to false.
     * @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true.
     */
    static roundRect(ctx, x, y, width, height, radius, stroke, fill)
    {
        if (stroke == undefined)
            stroke = true;
        if (radius === undefined)
            radius = 5;
        if(radius == 0)
        {
            ctx.rect(x, y, width, height);
        }
        else
        {
            x = Number(x);
            y = Number(y);
            width = Number(width);
            height = Number(height);
            radius = Number(radius);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }
        if (stroke)
            ctx.stroke();
        if (fill)
            ctx.fill();
    }

    static circle(ctx, x, y, radius, stroke, fill)
    {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2*Math.PI); // ends path
        ctx.closePath();
        if (stroke)
            ctx.stroke();
        if (fill)
            ctx.fill();
    }
}

Widget.AddWidgetClass("canvas", CanvasWidget);
window.CanvasUtils = CanvasWidget; // expose static methods
