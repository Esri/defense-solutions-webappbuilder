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
  'dojo/topic',
  'dojo/Stateful',
  'dojo/on',
  'esri/graphic',
  'esri/toolbars/draw',
  'esri/geometry/Circle',
  'esri/geometry/Polyline',
  'esri/geometry/geometryEngine',
  'esri/units',
  './Feedback',
  '../util'
], function (
  dojoDeclare,
  dojoLang,
  dojoConnect,
  dojoTopic,
  dojoStateful,
  dojoOn,
  EsriGraphic,
  esriDraw,
  EsriCircle,
  EsriPolyline,
  EsriGeometryEngine,
  esriUnits,
  DrawFeedBack,
  Utils
) {
  var clz = dojoDeclare([DrawFeedBack], {
    /*
     *
     */
    constructor: function () {
      this.inherited(arguments);

      this._utils = new Utils();

      this.syncEvents();

    },

    /*
     *
     */
    clearGraphics: function (evt) {
      this.map.graphics.clear();
    },

    /*
    * Start up event listeners
    */
    syncEvents: function () {

        dojoTopic.subscribe('MANUAL_CIRCLE_RADIUS_INPUT',
           dojoLang.hitch(this, this.manualRadiusUpdate)
        );

        dojoTopic.subscribe('MANUAL_CIRCLE_RADIUS_INPUT_COMPLETE',
           dojoLang.hitch(this, this.manualRadiusUpdateComplete)
        );
    },

    /*
    * Remove circle graphic since the radius is being manually entered
    */
    manualRadiusUpdate: function () {
        if (this.circleGraphic) {
            this.map.graphics.remove(this.circleGraphic);
        }
    },

    /*
    * Draw graphic
    */
    manualRadiusUpdateComplete: function (radius) {

        var stPt = this.get('startPoint');
        var circleGeometry = new EsriCircle(stPt, {
            radius: radius,
            geodesic: true
        });

        this.tempGraphic = new EsriGraphic(
          circleGeometry,
          this._circleSym
        );

        this.circleGraphic = new EsriGraphic(circleGeometry, this.fillSymbol);
        this.map.graphics.add(this.circleGraphic);

        dojoConnect.disconnect(this._onMouseMoveHandlerConnect);
        //this.cleanup();
        this._clear();
        this._setTooltipMessage(0);
        this._drawEnd(this.circleGraphic.geometry);
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
      this._points.push(start);

      switch (this._geometryType) {
        case esriDraw.POINT:
          this.set('startPoint', start.offset(0,0));
          this._drawEnd(start.offset(0,0));
          this._setTooltipMessage(0);
          break;
        case esriDraw.POLYLINE:
          // Finish Drawing
          if (this.get('startPoint') !== null) {
            this.set('endPoint', start);
            this._onDoubleClickHandler();
            return;
          } else {
            this.set('startPoint', start);
            this._onMouseMoveHandlerConnect = dojoConnect.connect(
              this.map,
              'onMouseMove',
              this._onMouseMoveHandler
            );
          }
        }

      this._setTooltipMessage(this._points.length);
      /*if (this._points.length === 2 && this._geometryType === 'circle') {
        var tooltip = this._tooltip;
        if (tooltip) {
          tooltip.innerHTML = 'Click to finish drawing circle';
        }
      }*/
    },

    /*
     *
     */
    _onMouseMoveHandler: function (evt) {
      var snapPoint;
      if (this.map.snappingManager) {
        snapPoint = this.map.snappingManager._snappingPoint;
      }

      var current = snapPoint || evt.mapPoint;
      var circleGeometry = this.setCircleGeometry(this.get('startPoint'), current);

      this.cleanup();
      this.circleGraphic = new EsriGraphic(circleGeometry, this.fillSymbol);
      this.map.graphics.add(this.circleGraphic);

    },

    /**
     *
     **/
    _onDoubleClickHandler: function (evt) {
      dojoConnect.disconnect(this._onMouseMoveHandlerConnect);
      this.cleanup();
      this._clear();
      this._setTooltipMessage(0);
      this._drawEnd(this.circleGraphic.geometry);
    },

    /*
     *
     */
    cleanup: function (evt) {
      if (this.circleGraphic) {
        this.map.graphics.remove(this.circleGraphic);
      }
    },

    /*
     *
     */
    setCircleGeometry: function (stPt, endPt) {

      var geom = new EsriPolyline(this.map.spatialReference);
      geom.addPath([stPt, endPt]);

      var length = EsriGeometryEngine.geodesicLength(geom, 9001);
      var unitLength = this._utils.convertMetersToUnits(length, this.lengthUnit);
      this.set('length', unitLength);

      if (this.isDiameter) {
        unitLength = unitLength / 2;
      }

      var circleGeometry = new EsriCircle(stPt, {
        radius: unitLength,
        geodesic: true
      });

      return circleGeometry;
    }
  });
  clz.DD_CIRCLE_LENGTH_DID_CHANGE = 'DD_CIRCLE_LENGTH_DID_CHANGE';
  return clz;
});
