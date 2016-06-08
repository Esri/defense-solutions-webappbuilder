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
//
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/connect',
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
  'esri/units',
  './Feedback'
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
  EsriUnits,
  DrawFeedBack
  ) {
  return dojoDeclare([esriDraw, dojoStateful, DrawFeedBack], {

    /**
     *
     **/
    constructor: function () {
      this.inherited(arguments);
    },

    /**
     * override drag event to create geodesic feedback
     **/
    _onMouseDragHandler: function (evt) {
      // Pressing escape while drawing causing errors for certain draw tools
      // -- Issue #1381
      if (!this._graphic && !this._points.length) {
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
      switch (this._geometryType) {
        case esriDraw.LINE:
          var g = dojoLang.mixin(_graphic.geometry, {
            paths: [
              [[start.x, start.y], [end.x, end.y]]
            ]
          });

          // get geodesic length of user drawn line
          esriGeoDUtils.geodesicDensify(g, 10000).then(function (r) {
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
                paths: [
                  [[start.x, start.y], [end.x, end.y]]
                ]
              });
              _graphic.setGeometry(_graphic.geometry);
              if (this.isDiameter) {
                this.showLength(end,l*2);
              } else {
                this.showLength(end, l);
              }

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

    /**
     *
     **/
    _onClickHandler: function (evt) {
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }

      var start = snappingPoint || evt.mapPoint;
      var  map = this.map;
      var screenPoint = map.toScreen(start);
      var tGraphic;
      var geom;

      this._points.push(start.offset(0, 0));
      switch (this._geometryType) {
        case esriDraw.POINT:
          this._drawEnd(start.offset(0, 0));
          this._setTooltipMessage(0);
          break;
        case esriDraw.POLYLINE:
          if (this._points.length === 2) {
            this.set('endPoint', this._points[1]);
            this._onDblClickHandler();
            return;
          }
          if (this._points.length === 1) {
            this.set('startPoint', this._points[0]);
            var polyline = new EsriPolyLine(map.spatialReference);
            polyline.addPath(this._points);
            this._graphic = map.graphics.add(new Graphic(polyline, this.lineSymbol), true);
            if (map.snappingManager) {
              map.snappingManager._setGraphic(this._graphic);
            }
            this._onMouseMoveHandler_connect = connect.connect(map, 'onMouseMove', this._onMouseMoveHandler);

            this._tGraphic = map.graphics.add(new Graphic(new EsriPolyLine({
              paths: [[[start.x, start.y], [start.x, start.y]]],
              spatialReference: map.spatialReference
            }), this.lineSymbol), true);
          } else {
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
          tooltip.innerHTML = 'Click to finish drawing line';
        }
      }
    },

    /**
     *
     **/
    _onDblClickHandler: function (evt) {
      var geometry,
        _pts = this._points,
        map = this.map,
        spatialReference = map.spatialReference;

      if (dojoHas("esri-touch") && evt) {
        _pts.push(evt.mapPoint);
      }

      geometry = new EsriPolyLine({ paths: [[[_pts[0].x, _pts[0].y], [_pts[1].x, _pts[1].y]]], spatialReference: spatialReference });
      //geometry = new EsriPolygon(spatialReference);
      geometry.geodesicLength = esriGeometryEngine.geodesicLength(geometry, 9001);

      connect.disconnect(this._onMouseMoveHandler_connect);

      this._clear();
      this._setTooltipMessage(0);
      this._drawEnd(geometry);
    },

    /**
     *
     **/
    _onMouseMoveHandler: function (evt) {
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
              paths: [
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

  });
});
