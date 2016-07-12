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
  'dojo/topic',
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
  './Feedback',
  '../util'
], function (
  dojoDeclare,
  dojoLang,
  connect,
  dojoHas,
  dojoNumber,
  dojoString,
  dojoTopic,
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
  DrawFeedBack,
  Utils
) {
      var lf = dojoDeclare([DrawFeedBack], {

        /**
         *
         **/
        constructor: function () {
          this.inherited(arguments);
        },

        /**
         *
         **/
        getAngle: function (stPoint, endPoint) {
          var angle = null;

          var delx = endPoint.y - stPoint.y;
          var dely = endPoint.x - stPoint.x;

          var azi = Math.atan2(dely, delx) * 180 / Math.PI;
          angle = ((azi + 360) % 360);

          if (this.angleUnit === 'mils') {
            angle *= 17.777777778;
          }

          return angle.toFixed(2);
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
          var geometry;
          var _pts = this._points;
          var map = this.map;
          var spatialreference = map.spatialReference;

          if (dojoHas('esri-touch') && evt) {
            _pts.push(evt.mapPoint);
          }
          geometry = new EsriPolyLine({
            paths: [[[_pts[0].x, _pts[0].y], [_pts[1].x, _pts[1].y]]],
            spatialReference: spatialreference
          });
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

          var start = (this._geometryType === esriDraw.POLYLINE) ?
          this._points[0] : this._points[this._points.length - 1];

          var end = snappingPoint || evt.mapPoint;

          this.set('currentEndPoint', end);
          
          var tGraphic = this._tGraphic;
          var geom = tGraphic.geometry;

          //_tGraphic.setGeometry(dojo.mixin(_tGraphic.geometry, { paths:[[[start.x, start.y], [end.x, end.y]]] }));
          geom.setPoint(0, 0, { x: start.x, y: start.y });
          geom.setPoint(0, 1, { x: end.x, y: end.y });

          var geogeom = esriGeometryEngine.geodesicDensify(geom, 10001);

          var majorAxisLength = esriGeometryEngine.geodesicLength(geom, 9001);

          this._graphic.setGeometry(geogeom);

          var unitlength = this._utils.convertMetersToUnits(majorAxisLength, this.lengthUnit);
          var ang = this.getAngle(start, end);

          dojoTopic.publish('DD_LINE_LENGTH_DID_CHANGE', unitlength);
          dojoTopic.publish('DD_LINE_ANGLE_DID_CHANGE', ang);
        }
      });
      lf.drawnLineLengthDidChange = 'DD_LINE_LENGTH_DID_CHANGE';
      lf.drawnLineAngleDidChange = 'DD_LINE_ANGLE_DID_CHANGE';
      return lf;
});
