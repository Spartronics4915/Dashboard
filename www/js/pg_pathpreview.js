//
// javascript page handler for pathpreview.html
//
(function(global) {
'use strict';

var PivotColor = { BLUE: "BLUE", RED: "RED"};

PivotColor.toColor = function(pc) {
  if (pc === PivotColor.RED) {
    return "#f93e3e";
  } else {
    return "#3e47f9";
  }
};

PivotColor.inverse = function(pc) {
  if (pc === PivotColor.RED) {
    return PivotColor.BLUE;
  } else {
    return PivotColor.RED;
  }
};

PivotColor = Object.freeze(PivotColor);

class FieldConfiguration {
  constructor(switchTopColor, scaleTopColor) {
    this.switchTopColor = switchTopColor;
    this.scaleTopColor = scaleTopColor;
  }

  toString() {
    return "Left switch is " + this.switchTopColor + ", Left scale is " + this.scaleTopColor;
  }
}

class PathData {
  constructor(name, composites) {
    this.name = name;
    this.composites = composites;
  }
}

const importData = new Map(); // Should be of type map[FieldConfiguration][]{file: string, reversed: boolean}
const reader = new FileReader();
var ctx;
var canvas;
var fieldConfig = new FieldConfiguration(PivotColor.BLUE, PivotColor.BLUE);
var curComposites;

var fieldImage;
const PATH_DATA_KEY = Object.freeze("autopaths");

const SWITCH_TOP = new Path2D();
const SWITCH_BOTTOM = new Path2D();
const SCALE_TOP = new Path2D();
const SCALE_BOTTOM = new Path2D();

var pathpreview = {
    getFieldConfiguration: function() {
      return new FieldConfiguration($("#switchisblue").hasClass("active") ? PivotColor.BLUE : PivotColor.RED, $("#scaleisblue").hasClass("active") ? PivotColor.BLUE : PivotColor.RED);
    },

    initializeComposites: function() {
      importData.set(new FieldConfiguration(PivotColor.RED, PivotColor.BLUE).toString(), []);
      importData.set(new FieldConfiguration(PivotColor.BLUE, PivotColor.RED).toString(), []);
      importData.set(new FieldConfiguration(PivotColor.RED, PivotColor.RED).toString(), []);
      importData.set(new FieldConfiguration(PivotColor.BLUE, PivotColor.BLUE).toString(), []);
    },

    pivCol: function() {
      return PivotColor.RED;
    },

    adjustCoordinatesForCanvas: function(canvas, mouseEvent){
      const rect = canvas.getBoundingClientRect()
      const y = mouseEvent.clientY - rect.top
      const x = mouseEvent.clientX - rect.left
      return {x:x, y:y}
    },

    refreshPathDisplay: function() {
      $("#pathcon").empty();

      var data = pathpreview.getPathData();
      var arrayLength = data.length;
      for (var i = 0; i < arrayLength; i++) {
        let v = data[i];

        // JSON can't store maps
        v.composites = new Map(v.composites);

        $("#pathcon").prepend(`
          <div class="path">
            <canvas id="canvasbackground"></canvas>
            <h1 style="font-size: 150%;">${v.name}</h1>
            <h5 style="font-size: 100%;"><a id="showpath" href="#pathpreview" role="button">Display path &raquo;</a></h5>
          </div>
          `);
        $("#showpath").click(function() {
          $("#pathdisplay").show();
          pathpreview.compositePaths(ctx, v.composites, fieldConfig.toString()).catch(err => {
            console.error("Couldn't composite paths: " + err);
          });
          pathpreview.drawPivots(fieldConfig);
        });

        $("#canvasbackground")[0].width = fieldImage.width;
        $("#canvasbackground")[0].height = fieldImage.height;

        pathpreview.compositePaths($("#canvasbackground")[0].getContext("2d"), v.composites, new FieldConfiguration(PivotColor.RED, PivotColor.BLUE).toString()).catch(err => {
          console.error("Couldn't composite paths for thumbnails: " + err);
        });
      }
    },

    compositePaths: async function(c, composites, fieldConfig) {
      curComposites = composites;

      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.drawImage(fieldImage, 0, 0);
      var array = composites.get(fieldConfig);
      if (!(array instanceof Array)) {
        console.error("Cannot composite an invalid field configuration");
        return;
      }
      var arrayLength = array.length;
      for (var i = 0; i < arrayLength; i++) {
        let image = await app.loadImage(array[i].file);
        if (array[i].reversed) {
          c.save();
          c.rotate(180);
          c.drawImage(image, 0, 0);
          c.restore();
        } else {
          c.drawImage(image, 0, 0);
        }
      }
    },

    getPathData: function() {
      var pathData = JSON.parse(localStorage.getItem(PATH_DATA_KEY));
      if (pathData === null || !(typeof pathData.push === "function")) {
        pathData = [];
      }
      return pathData;
    },

    clearImport: function() {
      pathpreview.initializeComposites();
      $("#compositecontainer").children("div").each(function() {
        if ($(this).data("fieldconfig") !== "all") {
          $(this).remove();
        }
      });
      $("#name").val("");
    },

    drawPivots: function(fieldConfig) {
      ctx.restore();

      ctx.strokeStyle = PivotColor.toColor(fieldConfig.scaleTopColor);
      ctx.stroke(SCALE_TOP);
      ctx.strokeStyle = PivotColor.toColor(PivotColor.inverse(fieldConfig.scaleTopColor));
      ctx.stroke(SCALE_BOTTOM);

      ctx.strokeStyle = PivotColor.toColor(fieldConfig.switchTopColor);
      ctx.stroke(SWITCH_TOP);
      ctx.strokeStyle = PivotColor.toColor(PivotColor.inverse(fieldConfig.switchTopColor));
      ctx.stroke(SWITCH_BOTTOM);
    },

    pageLoaded: async function(targetElem, html) {
        targetElem.innerHTML = html;

        SWITCH_TOP.rect(376, 232, 126, 95);
        SWITCH_BOTTOM.rect(376, 510, 126, 95);
        SCALE_TOP.rect(783.5, 184, 126, 95);
        SCALE_BOTTOM.rect(783.5, 556, 126, 95);

        ctx = $("#pathcanvas")[0].getContext("2d");
        canvas = $("#pathcanvas")[0];
        fieldImage = await app.loadImage("/images/field.png");

        ctx.lineWidth = 20;

        canvas.width = fieldImage.width;
        canvas.height = fieldImage.height;

        ctx.save();

        pathpreview.drawPivots(fieldConfig);

        if (!app.storageAvailable("localStorage")) {
          alert("Local storage unavailable! Autonomous paths won't be saved or loaded. " + app.storageAvailable())
        } else {
          if (localStorage.getItem(PATH_DATA_KEY) === "") {
            localStorage.setItem(PATH_DATA_KEY, JSON.stringify([]))
          }
        }

        pathpreview.initializeComposites();
        pathpreview.refreshPathDisplay();

        $("#addcomp").click(function() { // There will be multiple elements with this id, but this convieniently selects the first one in the tree, which is the one we want
          var data = pathpreview.getFieldConfiguration().toString();
          $("#compositecontainer").prepend(`
            <div id="composite" class="well well-sm" data-fieldconfig="${data}">
              <div class="row">
                <input type="file" id="compupload" class="col-sm-6" style="background-color: transparent;">
                <div class="checkbox col-sm-5">
                  <label><input type="checkbox" value="" id="compreversed">Reversed</label>
                </div>
                <a id="comprem" href="#pathpreview" role="button" class="col-sm-1"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a>
              </div>
            </div>
            `);

          $("#compupload")[0].addEventListener("change", function(evt) {
            var reversedCheck = $(this).parent().find("[id=compreversed]");
            $(this).prop("disabled", true);
            reversedCheck.prop("disabled", true);

            var reader = new FileReader();
            reader.addEventListener("load", function () {
              importData.get(pathpreview.getFieldConfiguration().toString()).push({file: reader.result, reversed: reversedCheck.is(":checked")});
            }, false);

            // Assumes only one file, because we don't have the "multiple" attribute on the input
            reader.readAsDataURL(evt.target.files[0]);
          }, false);

          $("#comprem").click(function() {
            var reader = new FileReader();
            reader.addEventListener("load", function () {
              var file = reader.result;
              if (file !== undefined) {
                var a = importData.get(pathpreview.getFieldConfiguration().toString());
                var arrayLength = a.length;
                for (var i = 0; i < arrayLength; i++) {
                    if (a[i].file === file && a[i].reversed === $(this).parent().find("[id=compreversed]").is(":checked")) {
                      a.splice(i, 1);
                    }
                }
              }
            }, false);
            reader.readAsDataURL($(this).parent().find("[id=compupload]")[0].files[0]);

            $(this).closest("[id=composite]").remove();
          });
        });

        $('input:radio[name=pivotstatus]').change(function() {
          $("#compositecontainer").children("div").each(function() {
            if ($(this).data("fieldconfig") === pathpreview.getFieldConfiguration().toString()) {
              $(this).show();
            } else if ($(this).data("fieldconfig") !== "all") {
              $(this).hide();
            }
          });
        });

        $("#compreversed").change(function() {
          $(this).is(":checked");
        });

        $("#discardpath").click(function() {
          pathpreview.clearImport();
        });

        $("#addpath").click(function() {
          var pathData = pathpreview.getPathData();
          pathData.push(new PathData($("#name").val(), Array.from(importData.entries())));
          localStorage.setItem(PATH_DATA_KEY, JSON.stringify(pathData));

          pathpreview.clearImport();

          pathpreview.refreshPathDisplay(); // Not very efficient, because it re-adds every path
        });

        $("#closedisplay").click(function() {
          $("#pathdisplay").hide();
        });

        $("#togswitch").click(function() {
          fieldConfig.switchTopColor = PivotColor.inverse(fieldConfig.switchTopColor);
          pathpreview.compositePaths(ctx, curComposites, fieldConfig.toString());
          pathpreview.drawPivots(fieldConfig);
        });

        $("#togscale").click(function() {
          fieldConfig.scaleTopColor = PivotColor.inverse(fieldConfig.scaleTopColor);
          pathpreview.compositePaths(ctx, curComposites, fieldConfig.toString());
          pathpreview.drawPivots(fieldConfig);
        });
    },
};
global.app.setPageHandler("pathpreview", pathpreview);

})(window);
