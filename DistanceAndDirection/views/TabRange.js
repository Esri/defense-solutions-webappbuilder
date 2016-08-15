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
    'dojo/number',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/TitlePane',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!../templates/TabRange.html',
    'esri/geometry/Circle',
    'esri/geometry/Point',
    'esri/geometry/Polyline',
    'esri/geometry/geometryEngine',
    'esri/graphic',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/LabelClass',
    'esri/tasks/FeatureSet',
    'esri/symbols/TextSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/geometry/webMercatorUtils',
    '../views/CoordinateInput',
    '../views/EditOutputCoordinate',
    '../util',
    '../models/RangeRingFeedback',
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
    dojoNumber,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitTitlePane,
    DijitTooltipDialog,
    DijitPopup,
    dijitWidgetsInTemplate,
    templateStr,
    EsriCircle,
    EsriPoint,
    EsriPolyline,
    EsriGeometryEngine,
    EsriGraphic,
    EsriGraphicsLayer,
    EsriFeatureLayer,
    EsriLabelClass,
    EsriFeatureSet,
    EsriTextSymbol,
    EsriSimpleFillSymbol,
    EsriSimpleLineSymbol,
    EsriSimpleMarkerSymbol,
    EsriWMUtils,
    CoordInput,
    EditOutputCoordinate,
    Util,
    DrawFeedBack
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

            this._ptSym = new EsriSimpleMarkerSymbol(this.pointSymbol);
            this._circleSym = new EsriSimpleFillSymbol(this.circleSymbol);
            this._lineSym = new EsriSimpleLineSymbol(this.lineSymbol);
            this._labelSym = new EsriTextSymbol(this.labelSymbol);

            this.map.addLayer(this.getLayer());

            this.coordTool = new CoordInput({
                appConfig: this.appConfig
            }, this.rangeCenter);
            this.coordTool.inputCoordinate.formatType = 'DD';

            this.coordinateFormat = new DijitTooltipDialog({
                content: new EditOutputCoordinate(),
                style: 'width: 400px'
            });

            // add extended toolbar
            this.dt = new DrawFeedBack(this.map);
            this.dt.setFillSymbol(this._circleSym);
            this.dt.set('lengthLayer', this._lengthLayer);

            this.syncEvents();
        },

        /*
         *
         */
        syncEvents: function () {

            this.dt.watch('startPoint', dojoLang.hitch(this, function (r, ov, nv) {
                this.coordTool.inputCoordinate.set('coordinateEsriGeometry', nv);
                this.dt.addStartGraphic(nv, this._ptSym);
            }));

            this.coordTool.inputCoordinate.watch('outputString', dojoLang.hitch(this, function (r, ov, nv) {
                this.coordTool.set('value', nv);
            }));

            this.own(
              this.coordTool.on('blur',
                dojoLang.hitch(this, this.coordToolDidLoseFocus)
              ),
              this.dt.on('draw-complete',
                dojoLang.hitch(this, this.feedbackDidComplete)
              ),
              dojoOn(this.numRadialsInput, 'keyup',
                dojoLang.hitch(this, this.numRadialsInputKeyWasPressed)
              ),
              dojoOn(this.ringIntervalUnitsDD, 'change',
                dojoLang.hitch(this, this.ringIntervalUnitsDidChange)
              ),
              dojoOn(this.coordinateFormatButton, 'click',
                dojoLang.hitch(this, this.coordinateFormatButtonWasClicked)
              ),
              dojoOn(this.addPointBtn, 'click',
                dojoLang.hitch(this, this.pointButtonWasClicked)
              ),
              dojoOn(this.coordinateFormat.content.applyButton, 'click',
                  dojoLang.hitch(this, function () {
                      var fs = this.coordinateFormat.content.formats[this.coordinateFormat.content.ct];
                      var cfs = fs.defaultFormat;
                      var fv = this.coordinateFormat.content.frmtSelect.get('value');
                      if (fs.useCustom) {
                          cfs = fs.customFormat;
                      }
                      this.coordTool.inputCoordinate.set(
                        'formatPrefix',
                        this.coordinateFormat.content.addSignChkBox.checked
                      );
                      this.coordTool.inputCoordinate.set('formatString', cfs);
                      this.coordTool.inputCoordinate.set('formatType', fv);
                      this.setCoordLabel(fv);

                      DijitPopup.close(this.coordinateFormat);
                  }
              )),
              dojoOn(this.coordinateFormat.content.cancelButton, 'click',
                dojoLang.hitch(this, function () {
                    DijitPopup.close(this.coordinateFormat);
                })
              )
            );

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
                  this.dt.addStartGraphic(r.coordinateEsriGeometry, this._ptSym);

              }));
        },

        /*
         *
         */
        coordinateFormatButtonWasClicked: function () {
            this.coordinateFormat.content.set('ct', this.coordTool.inputCoordinate.formatType);
            DijitPopup.open({
                popup: this.coordinateFormat,
                around: this.coordinateFormatButton
            });
        },

        /*
         * Button click event, activate feedback tool
         */
        pointButtonWasClicked: function () {
            this.map.disableMapNavigation();
            if (this.interactiveRings.checked) {
                this.dt.activate('polyline');
            } else {
                this.dt.activate('point');
            }
            dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
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
                var params = {
                    centerPoint: this.dt.get('startPoint') || this.coordTool.inputCoordinate.coordinateEsriGeometry,
                    numRings: this.numRingsInput.get('value'),
                    numRadials: this.numRadialsInput.get('value'),
                    radius: 0,
                    circle: null,
                    circles: [],
                    lastCircle: null,
                    r: 0,
                    c: 0,
                    radials: 0,
                    ringInterval: this.ringIntervalInput.get('value'),
                    ringIntervalUnitsDD: this.ringIntervalUnitsDD.get('value'),
                    circleSym: this._circleSym
                };
                this.createRangeRings(params);
                this.coordTool.clear();
            }
        },

        /*
         * upgrade graphicslayer so we can use the label params
         */
        getLayer: function () {
          if (!this._gl) {
            var layerDefinition = {
              'geometryType': 'esriGeometryPolyline',
              'extent': {
                'xmin': 0,
                'ymin': 0,
                'xmax': 0,
                'ymax': 0,
                'spatialReference': {
                    'wkid': 102100,
                    'latestWkid': 102100
                }
            },
              'fields': [{
                  'name': 'Interval',
                  'type': 'esriFieldTypeString',
                  'alias': 'Interval'
                }
              ]
            };

            var lblexp = {'labelExpressionInfo': {'value': '{Interval}'}};
            var lblClass = new EsriLabelClass(lblexp);
            lblClass.labelPlacement = 'center-end';
            lblClass.symbol = this._labelSym;
            //lblClass.where = 'Interval > 0';

            var fs = new EsriFeatureSet();

            var featureCollection = {
              layerDefinition: layerDefinition,
              featureSet: fs
            };

            this._gl = new EsriFeatureLayer(featureCollection, {
              showLabels: true
            });

            this._gl.setLabelingInfo([lblClass]);

            return this._gl;
          }
        },
        /*
         *
         */
        getInputsValid: function () {
            return this.coordTool.isValid() &&
              this.numRingsInput.isValid() &&
              this.ringIntervalInput.isValid() &&
              this.numRadialsInput.isValid();
        },

        /*
         *
         */
        createRangeRings: function (params) {

            if (params.centerPoint.spatialReference.wkid !== this.map.spatialReference.wkid) {
                params.centerPoint = EsriWMUtils.geographicToWebMercator(
                  params.centerPoint
                );
            }

            if (params.ringInterval && params.ringIntervalUnitsDD) {
                params.ringDistance = this._util.convertToMeters(
                    params.ringInterval, params.ringIntervalUnitsDD);
            }

            this.dt.removeStartGraphic();
            // create rings
            if (params.circles.length === 0) {
                for (params.r = 0; params.r < params.numRings; params.r++) {
                    params.radius += params.ringDistance;
                    params.circle = new EsriCircle({
                        center: params.centerPoint,
                        geodesic: true,
                        radius: params.radius
                    });
                    params.circles.push(params.circle);
                }
            }

            var u = this.ringIntervalUnitsDD.get('value');
            for (params.c = 0; params.c < params.circles.length; params.c++) {

              var p = {
                'paths': [params.circles[params.c].rings[0]],
                'spatialReference': this.map.spatialReference
              };
              var circlePath = new EsriPolyline(p);
              var cGraphic = new EsriGraphic(circlePath,
                this._lineSym,
                {
                  'Interval': dojoNumber.round(this._util.convertMetersToUnits(params.circles[params.c].radius, u))
                }
              );
              this._gl.add(cGraphic);
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

            //Create the cut geometry
            params.cutGeom = new EsriPolyline(params.centerPoint.spatialReference);
            params.cutGeom.paths = params.lastCircle.rings;

            //Clone the geodesic radial
            params.lineCopy = dojoLang.clone(params.geoPLine);

            for (params.radials = 0; params.radials < params.numRadials; params.radials++) {
                params.rotatedRadial = EsriGeometryEngine.rotate(
                  params.lineCopy, params.azimuth, params.centerPoint);
                //Cut the radial to the last range ring
                params.cutRadial = EsriGeometryEngine.cut(params.rotatedRadial, params.cutGeom);
                this._gl.add(new EsriGraphic(params.cutRadial.length === 1 ?
                    params.cutRadial[0] : params.cutRadial[1], this._lineSym, {'Interval': ''}));
                params.azimuth += params.interval;
            }

            this._gl.redraw();
            this.map.setExtent(params.lastCircle.getExtent().expand(3));
        },

        /*
         *
         */
        feedbackDidComplete: function (results) {
            var centerPoint = null;
            if (results.geometry.hasOwnProperty('circlePoints')) {

                centerPoint = results.geometry.circlePoints[0];
                var params = {
                    centerPoint: centerPoint,
                    numRadials: this.numRadialsInput.get('value'),
                    circles: [],
                    circleSym: this._circleSym,
                    r: 0,
                    c: 0,
                    radials: 0
                };
                var circle, radius;
                for (var i = 1; i < results.geometry.circlePoints.length; i++) {
                    radius = EsriGeometryEngine.distance(centerPoint, results.geometry.circlePoints[i], 9001);
                    circle = new EsriCircle({
                        center: centerPoint,
                        geodesic: true,
                        radius: radius
                    });
                    params.circles.push(circle);
                }

                this.createRangeRings(params);
            } else {
                centerPoint = results.geometry;
            }

            dojoDomClass.remove(this.addPointBtn, 'jimu-state-active');
            this.coordTool.clear();
            this.dt.deactivate();
            this.map.enableMapNavigation();
        },

        /*
         * Remove graphics and reset values
         */
        clearGraphics: function () {
            if (this._gl) {
                // graphic layers
                this._gl.clear();
                this._gl.refresh();
                this.dt.removeStartGraphic();
                this.coordTool.clear();
            }
        }
    });
});
