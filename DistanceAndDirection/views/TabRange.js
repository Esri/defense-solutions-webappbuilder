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

/*global define*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/topic',
    'dojo/string',
    'dojo/keys',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!../templates/TabRange.html',
    'esri/geometry/Circle',
    'esri/geometry/Point',
    'esri/geometry/Polyline',
    'esri/geometry/geometryEngine',
    'esri/graphic',
    'esri/layers/GraphicsLayer',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/geometry/webMercatorUtils',
    '../views/CoordinateInput',
    '../util',
    'dijit/form/NumberTextBox'
], function (
    dojoDeclare,
    dojoLang,
    dojoOn,
    dojoDomAttr,
    dojoDomClass,
    dojoDomStyle,
    dojoTopic,
    dojoString,
    dojoKeys,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    templateStr,
    EsriCircle,
    EsriPoint,
    EsriPolyline,
    EsriGeometryEngine,
    EsriGraphic,
    EsriGraphicsLayer,
    EsriSimpleFillSymbol,
    EsriSimpleLineSymbol,
    EsriWMUtils,
    CoordInput,
    Util
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: templateStr,
        baseClass: 'jimu-widget-TabRange',

        startPoint: null,
        _setStartPointAttr: function () {
          this._set('startPoint');
        },
        _getStartPointAttr: function () {
          return this.startPoint;
        },

        /*
         * class constructor
         */
        constructor: function (args) {
            dojoDeclare.safeMixin(this, args);
        },

        /*
         * dijit post create
         */
        postCreate: function () {
          console.log('TabRange');

          this._util = new Util();

          this._gl = new EsriGraphicsLayer();

          this._circleSym = new EsriSimpleFillSymbol(this.circleSymbol);
          this._lineSym = new EsriSimpleLineSymbol(this.lineSymbol);

          this.map.addLayer(this._gl);

          this.coordTool = new CoordInput({appConfig: this.appConfig}, this.rangeCenter);
          this.coordTool.formatType = 'DD';

          this.syncEvents();
        },

        /*
         *
         */
        syncEvents: function () {

          this.own(this.coordTool.on(
            'blur',
            dojoLang.hitch(this, this.coordToolDidLoseFocus)
          ));

          this.own(dojoOn(
            this.numRadialsInput,
            'keyup',
            dojoLang.hitch(this, this.numRadialsInputKeyWasPressed)
          ));

          this.own(dojoOn(
            this.ringIntervalUnitsDD,
            'change',
            dojoLang.hitch(this, this.ringIntervalUnitsDidChange)
          ));

          dojoTopic.subscribe(
            'DD_CLEAR_GRAPHICS',
            dojoLang.hitch(
              this,
              this.clearGraphics
            )
          );
        },

        /*
         *
         */
        setCoordLabel: function (toType) {
          this.rangeCenterLabel.innerHTML = dojoString.substitute(
            'Center Point (${crdType})', {
              crdType: toType
          });
        },

        /*
         *
         */
        coordToolDidLoseFocus: function () {
          this.coordTool.inputCoordinate.isManual = true;
          //this.coordTool.set('validateOnInput', true);
          this.coordTool.inputCoordinate.getInputType().then(
            dojoLang.hitch(this, function (r) {
              this.setCoordLabel(r.inputType);
              this._set('startPoint',
                this.coordTool.inputCoordinate.coordinateEsriGeometry);
          }));
        },

        /*
         *
         */
        ringIntervalUnitsDidChange: function () {
          this.ringIntervalUnit = this.ringIntervalUnitsDD.get('value');
        },
        /*
         *
         */
        numRadialsInputKeyWasPressed: function (evt) {
          // validate input
          if (evt.keyCode === dojoKeys.ENTER && this.getInputsValid()) {
            this.createRangeRings();
          }
        },

        getInputsValid: function () {
          return this.coordTool.isValid() &&
            this.numRingsInput.isValid() &&
            this.ringIntervalInput.isValid() &&
            this.numRadialsInput.isValid();
        },
        /*
         *
         */
        createRangeRings: function () {
          var params = {
            centerPoint : this.get('startPoint'),
            numRings : this.numRingsInput.get('value'),
            numRadials : this.numRadialsInput.get('value'),
            radius : 0,
            circle : null,
            circles : [],
            lastCircle: null,
            r: 0,
            c: 0,
            radials:0
          };

          if (params.centerPoint.spatialReference !== this.map.spatialReference) {
            params.centerPoint = EsriWMUtils.geographicToWebMercator(
              params.centerPoint
            );
          }

          params.ringDistance = this._util.convertToMeters(
            this.ringIntervalInput.get('value'),
            this.ringIntervalUnitsDD.get('value')
          );

          // create rings
          for (params.r = 0; params.r < params.numRings; params.r++) {
            params.radius += params.ringDistance;
            params.circle = new EsriCircle({
              center: params.centerPoint,
              geodesic: true,
              radius: params.radius
            });
            params.circles.push(params.circle);
          }

          for (params.c = 0; params.c < params.circles.length; params.c++) {
            this._gl.add(new EsriGraphic(params.circles[params.c], this._circleSym));
          }

          // create radials
          params.lastCircle = params.circles[params.circles.length - 1];
          params.firstpointofcircle = new EsriPoint(
            params.lastCircle.rings[0][0][0],
            params.lastCircle.rings[0][0][1],
            params.centerPoint.spatialReference
          );

          params.interval = 360.0 / params.numRadials;
          params.azimuth = 0.0;

          params.pLine = new EsriPolyline(params.centerPoint.spatialReference);
          params.pLine.addPath([
            dojoLang.clone(params.centerPoint),
            params.firstpointofcircle
          ]);

          params.geoPLine = EsriGeometryEngine.geodesicDensify(
            params.pLine, 9001
          );

          for (params.radials = 0; params.radials < params.numRadials; params.radials++) {
            params.lineCopy = dojoLang.clone(params.geoPLine);
            params.rotatedRadial = EsriGeometryEngine.rotate(
              params.lineCopy, params.azimuth, params.centerPoint);
            this._gl.add(new EsriGraphic(params.rotatedRadial, this._lineSym));
            params.azimuth += params.interval;
          }

          this.map.setExtent(params.lastCircle.getExtent().expand(3));

        },

        /*
         * Remove graphics and reset values
         */
        clearGraphics: function () {
          if (this._gl) {
            // graphic layers
            this._gl.clear();
          }
        }
    });
});
