///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  "dojo/_base/connect",
  'dojo/has',
  'dojo/number',
  'dojo/string',
  'dojo/Stateful',
  'esri/Color',
  'esri/toolbars/draw',
  'esri/graphic',
  'esri/geometry/Polyline',
  'esri/geometry/Polygon',
  'esri/geometry/Point',
  'esri/geometry/Circle',
  'esri/geometry/screenUtils',
  'esri/graphic',
  'esri/geometry/geometryEngineAsync',
  'esri/geometry/geometryEngine',
  'esri/symbols/TextSymbol',
  'esri/symbols/Font',
  'esri/geometry/webMercatorUtils',
  'esri/units'
], function (
  dojoDeclare,
  dojoLang,
  connect,
  dojoHas,
  dojoNumber,
  dojoString,
  dojoStateful,
  EsriColor,
  esriDraw,
  Graphic,
  EsriPolyLine,
  EsriPolygon,
  EsriPoint,
  EsriCircle,
  esriScreenUtils,
  EsriGraphic,
  esriGeoDUtils,
  esriGeometryEngine,
  EsriTextSymbol,
  EsriFont,
  EsriWebMercatorUtils,
  EsriUnits
  ) {
  return dojoDeclare([esriDraw, dojoStateful], {

    lengthLayer: null,
    _setLengthLayer: function (l) {
      this._set('lengthLayer', l);
    },

    lengthUnit: 'meters',
    _setLengthUnit: function (u) {
      this._set('lengthUnit', u);
    },

    /**
     *
     **/
    constructor: function () {
      // force loading of the geometryEngine
      // prevents lag in feedback when used in mousedrag
      esriGeoDUtils.isSimple(new EsriPoint({
          'x': -122.65,
          'y': 45.53,
          'spatialReference': {
            'wkid': 4326
          }
        })).then(function () {
          console.log('Geometry Engine initialized');
        });

      // this.inherited(arguments);
    },

    /**
     *
     * http://ekenes.github.io/esri-js-samples/ge-length/
     **/
    showLength: function (pt, result) {
      if (!this.lengthLayer) {return;}

      this.lengthLayer.clear();

      var length = dojoNumber.format(result, {places:2});
      var lenStr = dojoString.substitute('${len} ${units}', {
        len: length,
        units: this.lengthUnit
      });

      var screen = esriScreenUtils.toScreenPoint(
        this.map.extent,
        this.map.width,
        this.map.height,
        pt
      );
      screen.x -= 40;
      screen.y += 20;

      var lengthLoc = esriScreenUtils.toMapPoint(
        this.map.extent,
        this.map.width,
        this.map.height,
        screen
      );

      var lblFont = new EsriFont(
        14,
        EsriFont.STYLE_NORMAL,
        EsriFont.VARIANT_NORMAL,
        EsriFont.WEIGHT_BOLD,
        'Arial'
      );

      var txtLbl = new EsriTextSymbol(lenStr, lblFont, new EsriColor('black'));

      this.lengthLayer.add(new EsriGraphic(lengthLoc, txtLbl));
    },

    /**
     *
     **/
    numberWithCommas: function (x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * override drag event to create geodesic feedback
     **/
    _onMouseDragHandler: function (evt) {
      // Pressing escape while drawing causing errors for certain draw tools
      // -- Issue #1381
      if(!this._graphic && !this._points.length){
        return;
      }

      // BlackBerry legacy issue (not changing for 3x)
      if (dojoHas('esri-touch') && !this._points.length) {
        // BlackBerry Torch certainly needs this
        // to prevent page from panning
        evt.preventDefault();
        return;
      }

      this._dragged = true;
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = this._points[0],
        end = snappingPoint || evt.mapPoint,
        _graphic = this._graphic;
      switch(this._geometryType){
        case esriDraw.LINE:
          var g = dojoLang.mixin(_graphic.geometry, {
            paths:[
              [[start.x, start.y], [end.x, end.y]]
            ]});

          // get geodesic length of user drawn line
          esriGeoDUtils.geodesicDensify(g, 10000).then(function(r) {
            _graphic.setGeometry(r);
          });

          // draw length of current line
          if (this.lengthLayer) {
            esriGeoDUtils.geodesicLength(g, this.lengthUnit).then(
              dojoLang.hitch(this, function (l) {
                this.showLength(end, l);
              })
            );
          }
          break;
        case esriDraw.CIRCLE:
          var pLine = new EsriPolyLine({
            paths: [
              [[start.x, start.y], [end.x, end.y]]
            ],
            spatialReference: {
              wkid: _graphic.geometry.spatialReference.wkid
            }
          });
          pLine = EsriWebMercatorUtils.webMercatorToGeographic(pLine);

          esriGeoDUtils.geodesicLength(pLine, this.lengthUnit).then(
            dojoLang.hitch(this, function (l) {
                var circleParams = {
                  center: EsriWebMercatorUtils.webMercatorToGeographic(start),
                  geodesic: true,
                  numberOfPoints: 60,
                  radius: this.convertToMeters(l),
                  radiusUnits: this.getRadiusUnitType()
                };
                var g = new EsriCircle(circleParams);
                _graphic.geometry = dojoLang.mixin(g, {
                  paths:[
                    [[start.x, start.y], [end.x, end.y]]
                  ]});
                _graphic.setGeometry(_graphic.geometry);
              }
            ));
          break;
      }

      if (dojoHas('esri-touch')) {
        // Prevent iOS from panning the web page
        evt.preventDefault();
      }
      //this.inherited(arguments);
    },

    _onClickHandler: function (evt) {
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = snappingPoint || evt.mapPoint,
        map = this.map,
        screenPoint = map.toScreen(start),
        tGraphic, geom, polygon;

      this._points.push(start.offset(0, 0));
      switch (this._geometryType) {
        case esriDraw.POINT:          
          this._drawEnd(start.offset(0, 0));
          this._setTooltipMessage(0);          
          break;        
        case esriDraw.POLYLINE:
          if (this._points.length === 3) {
            this._onDblClickHandler();
            return;
          }
          if (this._points.length === 1) {
            var polyline = new EsriPolyLine(map.spatialReference);
            polyline.addPath(this._points);
            this._graphic = map.graphics.add(new Graphic(polyline, this.lineSymbol), true);
            if (map.snappingManager) {
              map.snappingManager._setGraphic(this._graphic);
            }
            this._onMouseMoveHandler_connect = connect.connect(map, "onMouseMove", this._onMouseMoveHandler);


            this._tGraphic = map.graphics.add(new Graphic(new EsriPolyLine({
              paths: [[[start.x, start.y], [start.x, start.y]]],
              spatialReference: map.spatialReference
            }), this.lineSymbol), true);
          }
          else {
            this._graphic.geometry._insertPoints([start.offset(0, 0)], 0);
            // map.graphics.remove(this._tGraphic, true);

            this._graphic.setGeometry(this._graphic.geometry).setSymbol(this.lineSymbol);

            tGraphic = this._tGraphic;
            geom = tGraphic.geometry;
            geom.setPoint(0, 0, start.offset(0, 0));
            geom.setPoint(0, 1, start.offset(0, 0));
            tGraphic.setGeometry(geom);
          }
          break;
      }
      this._setTooltipMessage(this._points.length);
      if (this._points.length === 2 && this._geometryType === 'polyline') {
        var tooltip = this._tooltip;
        if (tooltip) {
          tooltip.innerHTML = "Click to finish drawing ellipse";
        }
      }
    },

    _onDblClickHandler: function (evt) {
      var geometry,
        _pts = this._points,
        map = this.map,
        spatialReference = map.spatialReference;

      if (dojoHas("esri-touch")) {
        _pts.push(evt.mapPoint);
      }

      var currentVertex = _pts[_pts.length-1];
      var previousVertex = _pts[_pts.length-2];

      if(currentVertex && previousVertex && currentVertex.x ===
        previousVertex.x && currentVertex.y === previousVertex.y){
        _pts = _pts.slice(0, _pts.length - 1);
      }else{
        _pts = _pts.slice(0, _pts.length);
      }

      switch (this._geometryType) {
        case esriDraw.POLYLINE:
          if (! this._graphic || _pts.length < 2) {
            connect.disconnect(this._onMouseMoveHandler_connect);
            this._clear();
            this._onClickHandler(evt);
            return;
          }

          geometry = new EsriPolygon(spatialReference);

          var majorAxisGeom = new EsriPolyLine({ paths:[[[_pts[0].x, _pts[0].y], [_pts[1].x, _pts[1].y]]], spatialReference:spatialReference });
          var minorAxisGeom = new EsriPolyLine({ paths:[[[_pts[0].x, _pts[0].y], [_pts[2].x, _pts[2].y]]], spatialReference:spatialReference });
          var majorAxisLength = esriGeometryEngine.geodesicLength(majorAxisGeom, 9001);
          var minorAxisLength = esriGeometryEngine.geodesicLength(minorAxisGeom, 9001);

          var lineLength = function(x, y, x0, y0){
            return Math.sqrt((x -= x0) * x + (y -= y0) * y);
          };

          var computeAngle = function (pointA, pointB){
            var deltaX = pointB.y - pointA.y;
            var deltaY = pointB.x - pointA.x;
            var azi = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            return ((azi + 360) % 360);
          };

          var convertAngle = function (angle) {
            if (0 <= angle && angle < 90) {
              return 90 - angle;
            }
            if (90 <= angle && angle < 180) {
              return (180 - angle) + 270;
            }
            if (180 <= angle && angle < 270) {
              return (angle - 180) + 270;
            }
            if (270 <= angle && angle < 360) {
              return 180 - (angle - 270);
            }
            return angle;
          };

          var centerScreen = this.map.toScreen(_pts[0]);
          var majorScreen = this.map.toScreen(_pts[1]);
          var minorScreen = this.map.toScreen(_pts[2]);
          var majorRadius = lineLength(centerScreen.x, centerScreen.y, majorScreen.x, majorScreen.y);
          var minorRadius = lineLength(centerScreen.x, centerScreen.y, minorScreen.x, minorScreen.y);

          var angleDegrees = computeAngle(EsriWebMercatorUtils.webMercatorToGeographic(_pts[0]),
            EsriWebMercatorUtils.webMercatorToGeographic(_pts[1]));

          var ellipseParams = {
            center: centerScreen,
            longAxis: majorRadius,
            shortAxis: minorRadius,
            numberOfPoints: 60,
            map: this.map
          }
          var ellipse = EsriPolygon.createEllipse(ellipseParams);
          geometry.geometry = esriGeometryEngine.rotate(ellipse, convertAngle(angleDegrees));

          geometry = dojoLang.mixin(geometry, {
            majorAxisLength: majorAxisLength,
            minorAxisLength: minorAxisLength,
            angle: angleDegrees.toFixed(2),
            drawType: "ellipse",
            center: _pts[0]
          })
          break;
      }

      connect.disconnect(this._onMouseMoveHandler_connect);
      this._clear();
      this._setTooltipMessage(0);
      this._drawEnd(geometry);
    },

    _onMouseMoveHandler: function(evt) {
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = (this._geometryType === esriDraw.POLYLINE) ? this._points[0] : this._points[this._points.length - 1],
        end = snappingPoint || evt.mapPoint,
        tGraphic = this._tGraphic,
        geom = tGraphic.geometry;

      switch (this._geometryType) {
        case esriDraw.POLYLINE:
        case esriDraw.POLYGON:
          //_tGraphic.setGeometry(dojo.mixin(_tGraphic.geometry, { paths:[[[start.x, start.y], [end.x, end.y]]] }));
          geom.setPoint(0, 0, { x: start.x, y: start.y });
          geom.setPoint(0, 1, { x: end.x, y: end.y });

          if (this._points.length === 2) {
            var majorAxisGeom = new EsriPolyLine({
              paths:[
                [[this._points[0].x, this._points[0].y], [this._points[1].x, this._points[1].y]]
              ],
              spatialReference: this.map.spatialReference
            });
            var majorAxisLength = esriGeometryEngine.geodesicLength(majorAxisGeom, 9001);
            var minorAxisLength = esriGeometryEngine.geodesicLength(geom, 9001);
            if (minorAxisLength > majorAxisLength) {
              return;
            }
          }

          tGraphic.setGeometry(geom);
          break;
      }
    },

    getRadiusUnitType: function () {
      var selectedUnit = EsriUnits.METERS;
      switch (this.lengthUnit) {
        case "meters":
          selectedUnit = EsriUnits.METERS;
          break;
        case "feet":
          selectedUnit = EsriUnits.FEET;
          break;
        case "kilometers":
          selectedUnit = EsriUnits.KILOMETERS;
          break;
        case "miles":
          selectedUnit = EsriUnits.MILES;
          break;
        case "nautical-miles":
          selectedUnit = EsriUnits.NAUTICAL_MILES;
          break;
        case "yards":
          selectedUnit = EsriUnits.YARDS;
          break;
      }
      return selectedUnit;
    },

    convertToMeters: function (length) {
      var convertedLength = length;
      switch (this.lengthUnit) {
        case "meters":
          convertedLength = length;
          break;
        case "feet":
          convertedLength = length * 0.3048;
          break;
        case "kilometers":
          convertedLength = length * 1000;
          break;
        case "miles":
          convertedLength = length * 1609.34;
          break;
        case "nautical-miles":
          convertedLength = length * 1852.001376036;
          break;
        case "yards":
          convertedLength = length * 0.9144;
          break;
      }
      return convertedLength;
    }
  });
});
