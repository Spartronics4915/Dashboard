/* global Widget, app, cv */

// 26 ft. 11¼ in. by 52 ft. 5¼ in.
const s_fieldSize = [629.25, 323.25];

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
        this._trustCanvXform = true;

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

    // onIdle is registered with app as a "page idler", called when associated
    // page is visible.
    onIdle()
    {
        if(this.config.params.overlay  && this.config.params.overlay.enable)
        {
            this._updateOverlay();
        }
    }

    // like all widgets, changes to requested networktable keys ('ntkeys') 
    // trigger this message.
    valueChanged(key, value, isNew)
    {
        this._updateOverlay(key, value, isNew);
        if (key.startsWith("/SmartDashboard/Vision"))
            this.lastVisionKeyUpdate = new Date();
    }

    // when this canvas widget is of class "yespointer", this method is
    // invoked with mouse events.
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
        else
        {
            console.debug("no overlay config params");
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

        for(let item of this.config.params.overlay.items)
        {
            if(!item.enable) continue;
            if(key && app.ntkeyCompare(key, item.key))
                item.lastUpdate = new Date();
            switch(item.class)
            {
            case "poselist":
                this._drawPoselist(item);
                break;
            case "path":
                this._drawPath(item);
                break;
            case "text":
                {
                    let txt;
                    if(item.subclass != undefined)
                        txt = this._getItemText(item);
                    else
                        txt = item.value ? item.value : "<no value>";
                    let ctx = this.canvasCtx;
                    ctx.save();
                    ctx.fillStyle = item.fillStyle;
                    ctx.font = item.font;
                    if(item.shadowColor == undefined)
                        item.shadowColor =  "rgba(0,0,0,.8)";
                    if(item.shadowBlur == undefined)
                        item.shadowBlur = 3;
                    if(item.shadowOffsetX == undefined)
                        item.shadowOffsetX = 3;
                    if(item.shadowOffsetY == undefined)
                        item.shadowOffsetY = 3;
                    ctx.shadowColor =  item.shadowColor;
                    ctx.shadowBlur = item.shadowBlur;
                    ctx.shadowOffsetX = item.shadowOffsetX;
                    ctx.shadowOffsetY = item.shadowOffsetY;

                    if(Array.isArray(txt)) // array of {txt:, fill:}
                    {
                        let x = item.origin[0];
                        let y = item.origin[1];
                        for(let el of txt)
                        {
                            if(el.fill)
                                ctx.fillStyle = el.fill;
                            ctx.fillText(el.txt, x, y);
                            x += ctx.measureText(el.txt).width;
                        }
                    }
                    else
                        ctx.fillText(txt, item.origin[0], item.origin[1]);
                    ctx.restore();
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

                    // XXX: we need to make this year-agnostic by providing
                    // generic controls that can be configured via the layout file.
                    var turretOffset = document.getElementById("turretOffsetSliderSlider").value; //get from networktables
                    //
                    // FIXME: !! IMPORTANT !! boxWidth used as the camera view angle
                    //
                    // Add thickness/box for accuracy of shooter
                    item.viewAngle = document.getElementById("visionViewSliderSlider").value;
                    var boxWidth = item.viewAngle * w/360;

                    this.canvasCtx.lineWidth = item.lineWidth;
                    if(Math.abs(turretOffset) > 90) {
                        this.canvasCtx.strokeStyle = "rgba(255, 0, 0, 1)";
                    } else if(Math.abs(turretOffset) > item.viewAngle / 2 && Math.abs(turretOffset) <= 90) {
                        this.canvasCtx.strokeStyle = "rgba(255, 255, 0, 1)";
                    } else if(Math.abs(turretOffset) <= (item.viewAngle / 2) && turretOffset != 0) {
                        this.canvasCtx.strokeStyle = "rgba(0, 255, 0, 1)";
                    } else if(turretOffset == 0) {
                        this.canvasCtx.strokeStyle = "rgba(255, 255, 255, 1)";
                    }
                    this.canvasCtx.fillRect(centerX - boxWidth/2, 20, boxWidth, item.boxHeight);
                    this.canvasCtx.strokeRect(centerX - boxWidth/2, 20, boxWidth, item.boxHeight);
                    this.canvasCtx.strokeStyle = item.color1;
                    this.canvasCtx.beginPath();
                    this.canvasCtx.moveTo(centerX + turretOffset * (w / 360), 20);
                    this.canvasCtx.lineTo(centerX + turretOffset * (w / 360), item.boxHeight + 20);
                    this.canvasCtx.stroke();

                    this.canvasCtx.restore();
                }
                break;
            case "gauge":
                this._drawGauge(item);
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
            case "rects":
                // if(0)
                {
                    // rects are derived from item according to subclass
                    // a rect is expected to be an object with keys:
                    //   org: [x,y], 
                    //   size: [x,y], 
                    //   rotate: undefined/radians
                    //   radius: r/undefined
                    //   linewidth: l/undefined
                    //   stroke: style/undefined
                    //   fill: style/undefined
                    //   coordsys: "field", "canvas", undefined
                    
                    let rects = this._getRects(item);
                    if(!rects) 
                        break;
                    let ctx = this.canvasCtx;
                    for(let i=0;i<rects.length;i++)
                    {
                        let r = rects[i];
                        ctx.save();
                        if(r.fill)
                            ctx.fillStyle = r.fill;
                        if(r.stroke)
                            ctx.strokeStyle = r.stroke;
                        if(r.linewidth)
                            ctx.lineWidth = r.linewidth;
                        if(r.coordsys && r.coordsys == "field")
                            this._drawFieldBegin();
                        if(r.rotation)
                        {
                            ctx.translate(r.org[0], r.org[1]);
                            ctx.rotate(r.rotation);
                            CanvasWidget.roundRect(ctx,
                                            -r.size[0]/2, -r.size[1]/2,
                                            r.size[0], r.size[1], 
                                            r.radius, r.stroke, r.fill);
                        }
                        else
                        {
                            CanvasWidget.roundRect(ctx,
                                            r.org[0], r.org[1],
                                            r.size[0], r.size[1], 
                                            r.radius, r.stroke, r.fill);
                        }
                        ctx.restore();
                    }
                    break;
                }
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

    _canvasToFieldCoords(ccoords)
    {
        // fx = fW * cx/w
        // fy = fH/2 - fH * cy/h
        // cx = fx * w/fW
        // cy = (fy-fH/2)*h/-fH
        let fx = s_fieldSize[0] * (ccoords[0] / this.canvasEl.width);
        let fy = s_fieldSize[1] * .5 - 
                 s_fieldSize[1] * (ccoords[1] / this.canvasEl.height);
        app.putValue("Paths/Coords", `${fx.toFixed(1)} ${fy.toFixed(1)}`);
        return [fx, fy];
    }

    s_fieldToCanvasCoords(pose)
    {
        // pose is x, y (inches), cosangle, sinangle
        let cx = pose[0] * this.canvasEl.width / s_fieldSize[0];
        let cy = (pose[1]-s_fieldSize[1]*.5)*this.canvasEl.height / -s_fieldSize[1];
        // angles in canvas coords are just flipped in y (rotated 180)o
        // console.log(pose, cx, cy);
        return [cx, cy, pose[2], -pose[3]];
    }

    _getItemText(item)
    {
        let ret;
        switch(item.subclass)
        {
        case "time":
            if(item.value == undefined || item.value == "" || !app.robotConnected)
                ret = new Date().toLocaleTimeString();
            else
            {
                // else we're presumably listening on a nettab value
                // and will receive an update.
                ret = item.value;
            }
            break;
        case "cameraname":
            ret = this.cameraName;
            item.value = this.cameraName;
            break;
        case "selection":
            {
                ret = [];
                if(item.prompt)
                {
                    ret.push({txt: item.prompt,
                               fill: item.promptStyle});
                }
                let idx = item.value;
                let l = item.range[idx];
                if(l == undefined)
                    ret.push({txt:"none"}); // no fill ?
                else
                    ret.push({txt:l, fill:item.styles[idx]});
            }
            break;
        }
        return ret;
    }

    _drawGauge(item)
    {
        switch(item.subclass)
        {
        case "linear":
            {
                let ctx = this.canvasCtx;
                ctx.save();
                // first draw background
                let x0 = item.origin[0]; 
                let y0 = item.origin[1];
                let xsz = item.size[0];
                let ysz = item.size[1];
                let x1, y1, crad = 5;
                if(xsz > ysz) // horizontal
                {
                    x1 = x0 + xsz;
                    y1 = y0;
                }
                else
                {
                    x1 = 0;
                    y1 = y0 + ysz;
                }
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 1;
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
                    let prec = item.label.precision;
                    if(prec == undefined)
                        prec = 1;
                    let txt = app.interpolate(item.label.text, {
                                    value: Number(item.value).toFixed(prec)
                                            });
                    ctx.fillText(txt, 
                            x0 + item.label.offset[0], 
                            y0 + item.label.offset[1]);
                }
                ctx.restore();
            }
            break;
        case "radial":
            {
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
        }
    }

    // return an array of rect objects comprised of
    //   org: [x,y], 
    //   size: [x,y], 
    //   radius: r/undefined
    //   linewidth: l/undefined
    //   stroke: style/undefined
    //   fill: style/undefined
    //   coordsys: "field", "canvas", undefined
    _getRects(item)
    {
        if(!item.subclass)
        {
            // we expect a string with one or more rects separated by ';'
            let rects = [];
            let rarray = item.value.split(";");
            for(let i=0;i<rarray.length;i++)
            {
                let fields = rarray[i].split(",");
                if(fields.length >= 4)
                {
                    let r = {};
                    r.org = [fields[0], fields[1]];
                    r.size = [fields[1], fields[2]];
                    r.radius = fields[3];
                    r.linewidth = fields[4] ? fields[4] : item.lineWidth;
                    r.stroke = fields[5] ? fields[5] : item.strokeStyle;
                    r.fill = fields[6] ? fields[6] : item.fillStyle;
                    r.coordsys = fields[7];
                    rects.push(r);
                }
            }
            return rects;
        }
        else
        if(item.subclass == "pnp")
        {
            if(!item.lastUpdate || 
               (item.lastUpdate+item.targetTimeout) < new Date())
            {
                // target is stale
                return [];
            }

            let rects = [];
            let value = app.getValue(item.key, []);
            if (!Array.isArray(value))
            {
                app.error("pnp key " + item.key + 
                    " must be an array. Is a " + typeof item.value);
            }
            else 
            if((value.length-1) % 3 !== 0)
            {
                app.error("pnp value for key " + item.key + " is mis-sized.");
            }
            else
            {
                let numTargets = (value.length-1) / 3;
                if (numTargets > 3)
                    app.warning("Suspect number of targets: " + numTargets + " found.");
                else
                {
                    let stateMgr = app.getRobotStateMgr();
                    let lastState = stateMgr.getLatest(item.cameraOffset);
                    if (lastState)
                    {
                        let size = [item.width||16.0, item.height||12.0];
                        let radius = item.radius || 3;
                        let lineWidth = item.lineWidth || 3;
                        let stroke = item.strokeStyle;
                        let fill = item.fillStyle || "rgba(20,20,20,.5)";
                        for (let i=0,j=0; i<numTargets; i++,j+=3)
                        {
                            // Values are assumed relative offsets in
                            //  x, y (inches) and theta (radians)
                            let visState = stateMgr.relativePose(lastState,
                                            value[j], value[j+1], value[j+2]);
                            let r = {
                                org: [visState[0], visState[1]],
                                size: size,
                                rotation: visState[2],
                                radius: radius,
                                linewidth: lineWidth,
                                stroke : item.styles[i] || stroke,
                                fill : fill,
                                coordsys: "field"
                            };
                            rects.push(r);
                        }
                    }
                }
                return rects;
            }
        }
    }

    _drawFieldBegin()
    {
        // paths and poses
        // FRC field is 684 x 342, we assume we have the
        // correct aspect ratio. We assume field poses have
        // an origin at the midpoint and y is up.
        let ctx = this.canvasCtx;
        ctx.save();
        if(this._trustCanvXform)
        {
            let width = this.canvasEl.width;
            let height = this.canvasEl.height;
            let sx = width/s_fieldSize[0];
            let sy = -height/s_fieldSize[1]; // flip y
            // origin x is "left"
            // origin y is middle
            ctx.translate(0, height*.5);
            ctx.scale(sx, sy);
        }
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
        let poselists = app.getRobotStateMgr().getPoseLists();

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
        for(let key of app.getRobotStateMgr().getPoseListKeys())
        {
            // assume: one fill style per game-phase
            if(item.fillStyle[key])
                ctx.fillStyle = item.fillStyle[key];
            let poselist = poselists[key];
            for(let i=0;i<poselist.length;i++)
            {
                const pose = poselist[i];
                // pose is x, y (inches), cosangle, sinangle

                let x, y, cos, sin, rad, len;
                if(!this._trustCanvXform)
                {
                    const cpose = this._fieldToCanvasCoords(pose);
                    x = cpose[0];
                    y = cpose[1];
                    // const rads = pose[2];
                    cos = pose[3];
                    sin = -pose[4]; // flip y
                    len = 12;  // pixels
                    rad = 5;
                }
                else
                {
                    x = pose[0];
                    y = pose[1];
                    // const rads = pose[2];
                    cos = pose[3];
                    sin = pose[4]; 
                    len = 8;  // inches
                    rad = 3;
                }
                ctx.beginPath();
                ctx.arc(x, y, rad, 0, 2*Math.PI); // ends path
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(x,y);
                ctx.lineTo(x + cos*len, y + sin*len); 
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
        //      spline after curvature optimization
        //      time-constrained spline:
        //          color-coding velocity
        //          color-coding curvature
        let coords = null, fcoords = null;
        if(evt != undefined)
        {
            // has the side-effect of printing canvas coords
            coords = this._evtToCanvasCoords(evt);
            fcoords = this._canvasToFieldCoords(coords); // updates nettables
        }
        if(!item.value) return;

        let path = app.getPathsRepo().getPath(item.value);
        if(path != null)
        {
            if(!item.config.mode)
                item.config.mode = "waypoints";
            if(evt != undefined) // mouse moved
            {
                let p = path.intersect(item.config, fcoords[0], fcoords[1]);
                if(p)
                {
                    item._intersect = {
                        txt: p.asDetails(),
                        coords: coords
                    };
                }
                else
                    item._intersect = undefined;
            }
            else
            {
                let ctx = this._drawFieldBegin();
                path.draw(ctx, item.config);
                this._drawFieldEnd();
                if(item.label && item._intersect)
                {
                    ctx.save();
                    ctx.fillStyle = item.label.fillStyle;
                    ctx.font = item.label.font;
                    ctx.shadowColor = "black";
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    let mtxt = ctx.measureText(item._intersect.txt);
                    let x = item._intersect.coords[0]+10; 
                    let y;
                    let height = parseInt(item.label.font, 10);
                    if(item.config.mode == "waypoints")
                        y = item._intersect.coords[1];
                    else
                        y = item._intersect.coords[1]+height+5;
                    let rectY = Math.floor(y - .9*height);
                    ctx.fillStyle = "rgb(10,10,10)";
                    ctx.fillRect(x, rectY, mtxt.width, height);
                    ctx.fillStyle = item.label.fillStyle;
                    ctx.fillText(item._intersect.txt, x, y);
                    ctx.restore();
                }
            }
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
