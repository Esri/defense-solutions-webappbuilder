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
  'dojo/_base/connect',
  'dojo/has',
  'dojo/_base/lang',
  'dojo/topic',
  'esri/geometry/Point',
  'esri/geometry/Polyline',
  'esri/geometry/Polygon',
  'esri/geometry/geometryEngine',
  'esri/graphic',
  'esri/geometry/webMercatorUtils',
  './Feedback',
  '../util'
], function (
  dojoDeclare,
  dojoConnect,
  dojoHas,
  dojoLang,
  dojoTopic,
  EsriPoint,
  EsriPolyLine,
  EsriPolygon,
  esriGeometryEngine,
  EsriGraphic,
  EsriWebMercatorUtils,
  drawFeedback,
  Utils
) {
    var clz = dojoDeclare([drawFeedback], {
        orientationAngle: null,
        /*
         * Class Constructor
         */
        constructor: function () {
            this._utils = new Utils();
            this.syncEvents();
        },

        /*

        */
        syncEvents: function () {
            dojoTopic.subscribe(
                'manual-ellipse-major-axis-input',
                dojoLang.hitch(this, this.onMajorAxisManulInputHandler)
            );

            dojoTopic.subscribe(
                'manual-ellipse-minor-axis-input',
                dojoLang.hitch(this, this.onMinorAxisManulInputHandler)
            );

            dojoTopic.subscribe(
                'manual-ellipse-orientation-angle-input',
                dojoLang.hitch(this, this.onOrientationAngleManulInputHandler)
            );

            dojoTopic.subscribe(
                'manual-ellipse-center-point-input',
                dojoLang.hitch(this, this.onCenterPointManualInputHandler)
            );
        },

        /*
        Handler for major axis manual input
        */
        onMajorAxisManulInputHandler: function (majorLength) {
            if (majorLength === "") {
                return;
            }
            var map = this.map;
            //Check if we have a center point
            var centerPoint = this._points[0];
            if (centerPoint.spatialReference.wkid === 4326) {
                centerPoint = EsriWebMercatorUtils.geographicToWebMercator(centerPoint);
            }
            if (this._points.length >= 1) {
                //Convert to meters
                var lengthInMeters = this._utils.convertToMeters(Number(majorLength), this.lengthUnit);
                //We do have a center point. Get the end point
                var endPoint = this.getEndPoint(centerPoint, 1, lengthInMeters);
                //Add major length point to array
                this._points.splice(1, 0, endPoint);
                //Clear major length graphic first
                if (this._majGraphic) {
                    map.graphics.remove(this._majGraphic);
                }
                // create and add our major graphic
                var majorLine = new EsriPolyLine({
                    paths: [[
                      [centerPoint.x, centerPoint.y],
                      [endPoint.x, endPoint.y]]
                    ],
                    spatialReference: map.spatialReference
                });

                this._majGraphic = new EsriGraphic(majorLine, this.lineSymbol);
                map.graphics.add(this._majGraphic);
            }
        },

        /*
        Handler for minor axis manual input
        */
        onMinorAxisManulInputHandler: function (minorLength) {
            if (minorLength === "") {
                return;
            }
            var map = this.map;
            //Check if we have a center point
            var centerPoint = this._points[0];
            if (centerPoint.spatialReference.wkid === 4326) {
                centerPoint = EsriWebMercatorUtils.geographicToWebMercator(centerPoint);
            }
            if (this._points.length >= 2) {
                //Convert to meters
                var lengthInMeters = this._utils.convertToMeters(Number(minorLength), this.lengthUnit);
                //We do have a center point. Get the end point
                var endPoint = this.getEndPoint(centerPoint, 90, lengthInMeters);
                //Add major length point to array
                this._points.splice(2, 0, endPoint);
                //Clear major length graphic first
                if (this._minGraphic) {
                    map.graphics.remove(this._minGraphic);
                }
                // create and add our minor graphic
                var minorLine = new EsriPolyLine({
                    paths: [[
                      [centerPoint.x, centerPoint.y],
                      [endPoint.x, endPoint.y]]
                    ],
                    spatialReference: map.spatialReference
                });

                this._minGraphic = new EsriGraphic(minorLine, this.lineSymbol);
                map.graphics.add(this._minGraphic);
            }
        },

        /*
        Handler for orientation angle manual input
        */
        onOrientationAngleManulInputHandler: function (orientationAngle) {
            this.orientationAngle = Number(orientationAngle);
            //Check if we have a center, major and minor points
            if (this._points.length >= 3) {
                this._onDoubleClickHandler();
            }
        },

        /*
        Handler for the manual input of a center point
        */
        onCenterPointManualInputHandler: function (centerPoint) {
            this._points = [];
            this._points.push(centerPoint.offset(0, 0));
            this.set('startPoint', this._points[0]);
        },

        /*
        Retrieves the end point of a line given a start point and length
        */
        getEndPoint: function (startPoint, angle, distance) {
            var rotation = angle ? angle : 1;
            var result = {};
            result.x = Math.round(Math.cos(rotation * Math.PI / 180) * distance + startPoint.x);
            result.y = Math.round(Math.sin(rotation * Math.PI / 180) * distance + startPoint.y);
            return new EsriPoint({
                x: result.x,
                y: result.y,
                spatialReference: {
                    wkid: startPoint.spatialReference.wkid
                }
            });
        },

        /*
         *
         */
        _onClickHandler: function (evt) {
            var snapPoint;
            if (this.map.snappingManager) {
                snapPoint = this.map.snappingManager._snappingPoint;
            }

            var start = snapPoint || evt.mapPoint;
            var map = this.map;

            this._points.push(start.offset(0, 0));
            this.set('startPoint', this._points[0]);

            if (this._points.length >= 3) {
                this._onDoubleClickHandler();
                return;
            }

            if (this._points.length === 1) {
                // create and add our major graphic
                var pline = new EsriPolyLine({
                    paths: [[
                      [start.x, start.y],
                      [start.x, start.y]]
                    ], spatialReference: map.spatialReference
                });

                this._majGraphic = new EsriGraphic(pline, this.lineSymbol);
                map.graphics.add(this._majGraphic);

                // connect the mouse move event
                this._onMouseMoveHandlerConnect = dojoConnect.connect(
                  map,
                  'onMouseMove',
                  this._onMouseMoveHandler
                );

                // create our minor graphic
                var minLine = new EsriPolyLine({
                    paths: [[
                      [start.x, start.y],
                      [start.x, start.y]]
                    ], spatialReference: map.spatialReference
                });

                this._minGraphic = new EsriGraphic(minLine, this.lineSymbol);
                map.graphics.add(this._minGraphic);

            }

            this._setTooltipMessage(this._points.length);
            if (this._points.length === 2 && this._geometryType === 'polyline') {
                var tooltip = this._tooltip;
                if (tooltip) {
                    tooltip.innerHTML = 'Click to finish drawing ellipse';
                }
            }
        },

        /*
         *
         */
        _onMouseMoveHandler: function (evt) {

            var snapPoint;
            if (this.map.snappingManager) {
                snapPoint = this.map.snappingManager._snappingPoint;
            }

            var end = snapPoint || evt.mapPoint;
            var majorAxisLength = 0;

            if (this._points.length === 1) {
                this._majGraphic.geometry.setPoint(0, 1, end);
                this._majGraphic.setGeometry(this._majGraphic.geometry).setSymbol(this.lineSymbol);

                majorAxisLength = esriGeometryEngine.geodesicLength(this._majGraphic.geometry, 9001);
                var majorUnitLength = this._utils.convertMetersToUnits(majorAxisLength, this.lengthUnit);
                dojoTopic.publish('DD_ELLIPSE_MAJOR_LENGTH_CHANGE', majorUnitLength);

            } else {
                var prevgeom = dojoLang.clone(this._minGraphic.geometry);

                this._minGraphic.geometry.setPoint(0, 1, end);
                this._minGraphic.setGeometry(this._minGraphic.geometry).setSymbol(this.lineSymbol);

                majorAxisLength = esriGeometryEngine.geodesicLength(this._majGraphic.geometry, 9001);
                var minorAxisLength = esriGeometryEngine.geodesicLength(this._minGraphic.geometry, 9001);
                var minorUnitLength = this._utils.convertMetersToUnits(minorAxisLength, this.lengthUnit);

                if (minorAxisLength > majorAxisLength) {
                    this._minGraphic.setGeometry(prevgeom);
                    return;
                }

                dojoTopic.publish('DD_ELLIPSE_MINOR_LENGTH_CHANGE', minorUnitLength);
            }
        },

        /*
        Gets length of line based on two points
        */
        getLineLength: function (x, y, x0, y0) {
            return Math.sqrt((x -= x0) * x + (y -= y0) * y);
        },

        /*
        Gets angle based on two points
        */
        getAngle: function (pointA, pointB) {
            var deltaX = pointB.y - pointA.y;
            var deltaY = pointB.x - pointA.x;
            var azi = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            return ((azi + 360) % 360);
        },

        /*
        Convert normal angle to esri angle so geometryEngine
        can rotate accordingly
        */
        convertAngle: function (angle) {
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
        },

        /*
         *
         */
        _onDoubleClickHandler: function (evt) {
            //if (dojoHas('esri-touch')) {
            //    this._points.push(evt.mapPoint);
            //}

            var currentVertex = this._points[this._points.length - 1];
            var previousVertex = this._points[this._points.length - 2];
            if (currentVertex &&
              previousVertex &&
              currentVertex.x === previousVertex.x &&
              currentVertex.y === previousVertex.y
            ) {
                this._points = this._points.slice(0, this._points.length - 1);
            } else {
                this._points = this._points.slice(0, this._points.length);
            }

            if (!this._majGraphic || !this._minGraphic) {
                dojoConnect.disconnect(this._onMouseMoveHandlerConnect);
                this._clear();
                this._onClickHandler(evt);
                return;
            }

            var elipseGeom = new EsriPolygon(this.map.spatialReference);

            /*var majorAxisGeom = new EsriPolyLine({
              paths:[[
                [this._points[0].x, this._points[0].y],
                [this._points[1].x, this._points[1].y]
              ]], spatialReference: this.map.spatialReference
            });*/

            /*var minorAxisGeom = new EsriPolyLine({
              paths:[[
                [this._points[0].x, this._points[0].y],
                [this._points[2].x, this._points[2].y]
              ]], spatialReference: this.map.spatialReference
            });*/

            var majorAxisLength = esriGeometryEngine.geodesicLength(this._majGraphic.geometry, 9001);
            var minorAxisLength = esriGeometryEngine.geodesicLength(this._minGraphic.geometry, 9001);

            var centerScreen = this.map.toScreen(this._points[0]);
            var majorScreen = this.map.toScreen(this._points[1]);
            var minorScreen = this.map.toScreen(this._points[2]);

            var majorRadius = this.getLineLength(centerScreen.x, centerScreen.y, majorScreen.x, majorScreen.y);
            var minorRadius = this.getLineLength(centerScreen.x, centerScreen.y, minorScreen.x, minorScreen.y);

            var angleDegrees = this.getAngle(
              EsriWebMercatorUtils.webMercatorToGeographic(this._points[0]),
              EsriWebMercatorUtils.webMercatorToGeographic(this._points[1])
            );

            var ellipseParams = {
                center: centerScreen,
                longAxis: majorRadius,
                shortAxis: minorRadius,
                numberOfPoints: 60,
                map: this.map
            };

            var ellipse = EsriPolygon.createEllipse(ellipseParams);
            elipseGeom.geometry = esriGeometryEngine.rotate(ellipse,
                this.orientationAngle !== null ?
                this.orientationAngle : this.convertAngle(angleDegrees));

            elipseGeom = dojoLang.mixin(elipseGeom, {
                majorAxisLength: majorAxisLength,
                minorAxisLength: minorAxisLength,
                angle: this.orientationAngle !== null ?
                    this.orientationAngle.toFixed(2) : angleDegrees.toFixed(2),
                drawType: 'ellipse',
                center: this._points[0]
            });

            dojoConnect.disconnect(this._onMouseMoveHandlerConnect);
            this._setTooltipMessage(0);
            this._drawEnd(elipseGeom);
            this.map.graphics.remove(this._majGraphic);
            this.map.graphics.remove(this._minGraphic);
            this._majGraphic = null;
            this._minGraphic = null;
            this.orientationAngle = null;
            this._clear();
        }

    });
    clz.DD_ELLIPSE_MAJOR_LENGTH_CHANGE = 'DD_ELLIPSE_MAJOR_LENGTH_CHANGE';
    clz.DD_ELLIPSE_MINOR_LENGTH_CHANGE = 'DD_ELLIPSE_MINOR_LENGTH_CHANGE';
    return clz;
});
