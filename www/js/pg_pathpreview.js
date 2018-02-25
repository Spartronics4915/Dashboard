//
// javascript page handler for pathpreview.html
//
(function(global) {
'use strict';

var PivotColor = Object.freeze({ BLUE: "BLUE", RED: "RED"});

class FieldConfiguration {
  constructor(switchLeftColor, scaleLeftColor) {
    this.switchLeftColor = switchLeftColor;
    this.scaleLeftColor = scaleLeftColor;
  }

  toString() {
    return "Left switch is " + this.switchLeftColor + ", Left scale is " + this.scaleLeftColor;
  }
}

class PathData {
  constructor(name, composites) {
    this.name = name;
    this.composites = composites;
  }
}

var importData = new Map(); // Should be of type map[FieldConfiguration][]{file: string, reversed: boolean}
var reader = new FileReader();
var ctx;
var canvas;
var fieldImage;

const PATH_DATA_KEY = Object.freeze("autopaths");

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

    com: function() {
      return importData;
    },

    refreshPathDisplay: function() {
      $("#pathcon").empty();

      var data = pathpreview.getPathData();
      var arrayLength = data.length;
      for (var i = 0; i < arrayLength; i++) {
        var v = data[i];
        if (!(v.composites instanceof Map)) { // JSON can't store maps
          console.log("Rebuilding a map...");
          v.composites = new Map(v.composites);
        }
        pathpreview.compositePaths(v.composites, new FieldConfiguration(PivotColor.RED, PivotColor.BLUE).toString()).then(dataURL => {
          $("#pathcon").prepend(`
            <div class="path" style="background-image: url(${dataURL}); background-repeat: no-repeat; background-size: cover;">
              <h1 style="font-size: 150%;">${v.name}</h1>
              <h5 style="font-size: 100%;"><a id="showpath" href="#pathpreview">Display path &raquo;</a></h5>
            </div>
            `);
        }).catch(err => {
          console.error("Couldn't composite paths: " + err);
        });
      }
    },

    compositePaths: async function(composites, fieldConfig) { // This uses the display canvas for compositing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(fieldImage, 0, 0);
      var array = composites.get(fieldConfig);
      var arrayLength = array.length;
      for (var i = 0; i < arrayLength; i++) {
        let image = await app.loadImage(array[i].file);
        if (array[i].reversed) {
          ctx.save();
          ctx.rotate(180);
          ctx.drawImage(image, 0, 0);
          ctx.restore();
        } else {
          ctx.drawImage(image, 0, 0);
        }
      }
      return canvas.toDataURL();
    },

    getPathData: function() {
      var pathData = JSON.parse(localStorage.getItem(PATH_DATA_KEY));
      if (pathData === null || !(typeof pathData.push === "function")) {
        pathData = [];
      }
      return pathData;
    },

    pageLoaded: async function(targetElem, html) {
        targetElem.innerHTML = html;

        ctx = $("#pathcanvas")[0].getContext("2d");
        canvas = $("#pathcanvas")[0];
        fieldImage = await app.loadImage("/images/field.png");

        canvas.width = fieldImage.width;
        canvas.height = fieldImage.height;

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
                <a id="comprem" href="#pathpreview" class="col-sm-1"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a>
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
          pathpreview.initializeComposites();
          $("#compositecontainer").children("div").each(function() {
            if ($(this).data("fieldconfig") !== "all") {
              $(this).remove();
            }
          });
        });

        $("#addpath").click(function() {
          var pathData = pathpreview.getPathData();
          pathData.push(new PathData($("#name").val(), Array.from(importData.entries())));
          localStorage.setItem(PATH_DATA_KEY, JSON.stringify(pathData));

          pathpreview.refreshPathDisplay(); // Not very efficient, because it re-adds every path
        });
    },
};
global.app.setPageHandler("pathpreview", pathpreview);

})(window);
