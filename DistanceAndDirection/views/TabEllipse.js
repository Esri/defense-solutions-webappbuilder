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
    'dojo/topic',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/string',
    'dojo/number',
    'dojo/keys',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/TitlePane',
    'dijit/TooltipDialog',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/popup',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/LabelClass',
    'esri/geometry/geometryEngine',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/TextSymbol',
    'esri/graphic',
    'esri/units',
    'esri/geometry/webMercatorUtils',
    'esri/tasks/FeatureSet',
    '../models/EllipseFeedback',
    '../models/ShapeModel',
    '../views/CoordinateInput',
    '../views/EditOutputCoordinate',
    'dojo/text!../templates/TabEllipse.html'
], function (
    dojoDeclare,
    dojoLang,
    dojoOn,
    dojoTopic,
    dojoDomAttr,
    dojoDomClass,
    dojoDomStyle,
    dojoString,
    dojoNumber,
    dojoKeys,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitTitlePane,
    DijitTooltipDialog,
    dijitWidgetsInTemplate,
    DijitPopup,
    EsriGraphicsLayer,
    EsriFeatureLayer,
    EsriLabelClass,
    esriGeometryEngine,
    EsriSimpleMarkerSymbol,
    EsriSimpleLineSymbol,
    EsriSimpleFillSymbol,
    EsriTextSymbol,
    EsriGraphic,
    esriUnits,
    esriWMUtils,
    EsriFeatureSet,
    DrawFeedBack,
    ShapeModel,
    CoordInput,
    EditOutputCoordinate,
    templateStr
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: templateStr,
        baseClass: 'jimu-widget-TabEllipse',

        centerPointGraphic: null,

        /*
         * class constructor
         */
        constructor: function (args) {
            dojoDeclare.safeMixin(this, args);
        },

        /*
         * upgrade graphicslayer so we can use the label params
         */
        getLayer: function () {
          if (!this._gl) {
            var layerDefinition = {
              'extent': {
                'xmin': 0,
                'ymin': 0,
                'xmax': 0,
                'ymax': 0,
                'spatialReference': {
                    'wkid': 102100,
                    'latestWkid': 102100
                }},
              'geometryType': 'esriGeometryPolygon',
              'fields': [{
                  'name': 'MAJOR',
                  'type': 'esriFieldTypeDouble',
                  'alias': 'Major'
                }, {
                    'name': 'MINOR',
                    'type': 'esriFieldTypeDouble',
                    'alias': 'Minor'
                }, {
                    'name': 'ORIENTATION_ANGLE',
                    'type': 'esriFieldTypeDouble',
                    'alias': 'Orientation Angle'
                }
              ]
            };

            var lblexp = {'labelExpressionInfo': {'value': 'Major: {MAJOR} Minor: {MINOR} Angle: {ORIENTATION_ANGLE}'}};
            var lblClass = new EsriLabelClass(lblexp);
            lblClass.symbol = this._labelSym;

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
         * widget is alive, initilize our stuff
         */
        postCreate: function () {
            this.currentAngleUnit = this.angleUnitDD.get('value');
            this.currentLengthUnit = this.lengthUnitDD.get('value');

            this._labelSym = new EsriTextSymbol(this.labelSymbol);
            this._ptSym = new EsriSimpleMarkerSymbol(this.pointSymbol);
            this._ellipseSym = new EsriSimpleFillSymbol(this.ellipseSymbol);

            this.map.addLayer(this.getLayer());
            this.coordTool = new CoordInput({
                appConfig: this.appConfig
            }, this.startPointCoords);
            this.coordTool.inputCoordinate.formatType = 'DD';

            this.coordinateFormat = new DijitTooltipDialog({
                content: new EditOutputCoordinate(),
                style: 'width: 400px'
            });

            // add extended toolbar
            this.dt = new DrawFeedBack(this.map);
            this.dt.setLineSymbol(this._ellipseSym);
            this.dt.set('lengthUnit', 'feet');

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

            this.coordTool.inputCoordinate.watch(
              'outputString', dojoLang.hitch(
                this, function (r, ov, nv) {
                this.coordTool.set('value', nv);
            }));

            dojoTopic.subscribe(
              'DD_CLEAR_GRAPHICS',
              dojoLang.hitch(this, this.clearGraphics)
            );

            dojoTopic.subscribe(
              'DD_WIDGET_OPEN',
              dojoLang.hitch(this, this.setGraphicsShown));

            dojoTopic.subscribe(
              'DD_WIDGET_CLOSE',
              dojoLang.hitch(this, this.setGraphicsHidden));

            dojoTopic.subscribe(
              DrawFeedBack.DD_ELLIPSE_MINOR_LENGTH_CHANGE,
              dojoLang.hitch(
                this,
                this.minorLengthDidChange
              )
            );

            dojoTopic.subscribe(
              DrawFeedBack.DD_ELLIPSE_MAJOR_LENGTH_CHANGE,
              dojoLang.hitch(
                this,
                this.majorLengthDidChange
              )
            );

            this.own(
              this.dt.on(
                'draw-complete',
                dojoLang.hitch(this, this.feedbackDidComplete)
              ),
              this.ellipseType.on(
                'change',
                dojoLang.hitch(this, this.ellipseTypeChangeHandler)
              ),
              this.angleUnitDD.on(
                'change',
                dojoLang.hitch(this, this.angleUnitDDDidChange)
              ),
              this.lengthUnitDD.on(
                'change',
                dojoLang.hitch(this, this.lengthUnitDDDidChange)
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
              dojoOn(this.addPointBtn, 'click',
                dojoLang.hitch(this, this.pointButtonWasClicked)
              ),
              dojoOn(this.coordTool, 'keyup',
                dojoLang.hitch(this, this.coordToolKeyWasPressed)
              ),
              dojoOn(this.majorAxisInput, 'keyup',
                dojoLang.hitch(this, this.onMajorAxisInputKeyupHandler)
              ),
              dojoOn(this.minorAxisInput, 'keyup',
                dojoLang.hitch(this, this.onMinorAxisInputKeyupHandler)
              ),
              dojoOn(this.angleInput, 'keyup',
                dojoLang.hitch(this, this.onOrientationAngleKeyupHandler)
              )
            );
        },

        /*
         *
         */
        onMajorAxisInputKeyupHandler: function (evt) {
            dojoTopic.publish('manual-ellipse-major-axis-input', this.majorAxisInput.value);
        },

        /*
         *
         */
        onMinorAxisInputKeyupHandler: function (evt) {
            dojoTopic.publish('manual-ellipse-minor-axis-input', this.minorAxisInput.value);
        },

        /*
         *
         */
        onOrientationAngleKeyupHandler: function (evt) {
            if (evt.keyCode === dojoKeys.ENTER) {
                dojoTopic.publish('manual-ellipse-orientation-angle-input', this.angleInput.value);
            }
        },

        /*
         * update the gui with the major axis length
         */
        majorLengthDidChange: function (l) {
            var fl = dojoNumber.format(l, { places: 2 });
            dojoDomAttr.set(
              this.majorAxisInput,
              'value',
              fl //this._getFormattedLength(l)
            );
        },

        /*
         * update the gui with the min axis length
         */
        minorLengthDidChange: function (l) {
            var fl = dojoNumber.format(l, { places: 2 });
            dojoDomAttr.set(
              this.minorAxisInput,
              'value',
              fl //this._getFormattedLength(l)
            );
        },

        /*
         * catch key press in start point
         */
        coordToolKeyWasPressed: function (evt) {

            if (evt.keyCode === dojoKeys.ENTER) {
                this.coordTool.inputCoordinate.getInputType().then(dojoLang.hitch(this, function (r) {
                    dojoTopic.publish(
                      'manual-ellipse-center-point-input',
                      this.coordTool.inputCoordinate.coordinateEsriGeometry
                    );
                    this.dt.addStartGraphic(
                      this.coordTool.inputCoordinate.coordTool,
                      this._ptSym
                    );
                    //this.createCenterPointGraphic();
                }));
            }
        },

        /*
         * Button click event, activate feedback tool
         */
        pointButtonWasClicked: function () {
            this.map.disableMapNavigation();
            this.dt.activate('polyline');
            dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
        },

        /*
          *
          */
        lengthUnitDDDidChange: function () {
            this.currentLengthUnit = this.lengthUnitDD.get('value');
            this.dt.set('lengthUnit', this.currentLengthUnit);
            if (this.currentEllipse) {
                this.ellipseTypeChangeHandler();
                dojoDomAttr.set(
                  this.minorAxisInput,
                  'value',
                  this._getFormattedLength(this.currentEllipse.geometry.minorAxisLength)
                );
            }
        },

        /*
          *
          */
        ellipseTypeChangeHandler: function () {
            var majorAxisLength = this.ellipseType.get('value') === 'full' ?
              this.currentEllipse.geometry.majorAxisLength * 2 :
              this.currentEllipse.geometry.majorAxisLength;
            dojoDomAttr.set(
              this.majorAxisInput,
              'value',
              this._getFormattedLength(majorAxisLength)
            );
        },

        /*
          *
          */
        angleUnitDDDidChange: function () {
            this.currentAngleUnit = this.angleUnitDD.get('value');

            if (this.currentEllipse) {
                dojoDomAttr.set(
                  this.angleInput,
                  'value',
                  this.currentEllipse.getAngle(this.currentAngleUnit));
            }
        },

        /*
         *
         */
        feedbackDidComplete: function (results) {
          this.currentEllipse = new ShapeModel(results);
          this.currentEllipse.graphic = new EsriGraphic(
            this.currentEllipse.wmGeometry,
            this._ellipseSym
          );

          this.lengthUnitDDDidChange();
          this.angleUnitDDDidChange();

          this.currentEllipse.graphic.setAttributes({
            'MINOR': parseFloat(dojoDomAttr.get(this.minorAxisInput, 'value').replace(',',''),2),
            'MAJOR': parseFloat(dojoDomAttr.get(this.majorAxisInput, 'value').replace(',',''),2),
            'ORIENTATION_ANGLE': parseFloat(this.currentEllipse.angle.replace(',',''),2)
          });

          this._gl.add(this.currentEllipse.graphic);
          this._gl.refresh();
          this.emit('graphic_created', this.currentEllipse);

          this.map.enableMapNavigation();
          this.dt.deactivate();
          this.dt.removeStartGraphic();
          dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
        },

        /*
         *
         */
        clearGraphics: function () {
          if (this._gl) {
            this._gl.clear();
            this.coordTool.clear();
            dojoDomAttr.set(this.startPointCoords, 'value', '');
            dojoDomAttr.set(this.majorAxisInput, 'value', '');
            dojoDomAttr.set(this.minorAxisInput, 'value', '');
            dojoDomAttr.set(this.angleInput, 'value', '');
          }
        },

        /*
         *
         */
        setGraphicsHidden: function () {
          if (this._gl) {
            this._gl.hide();
          }
        },

        /*
         *
         */
        setGraphicsShown: function () {
          if (this._gl) {
            this._gl.show();
          }
        },

        /*
         * Creates a temporary center point on the map
         */
        createCenterPointGraphic: function () {
          if (this.centerPointGraphic !== null) {
            this._gl.remove(this.centerPointGraphic);
          }
          var centerPoint = this.coordTool.inputCoordinate.coordinateEsriGeometry;
          if (centerPoint) {
            this.centerPointGraphic = new EsriGraphic(
              centerPoint, new EsriSimpleMarkerSymbol()
            );
            this._gl.add(this.centerPointGraphic);
          }
        },

        /*
         * Removes the center point graphic
         */
        removeCenterPointGraphic: function () {
          if (this.centerPointGraphic) {
            this._gl.remove(this.centerPointGraphic);
          }
        },

        /*
         *
         */
        _getFormattedLength: function (length) {
          var convertedLength = length;
          switch (this.currentLengthUnit) {
            case 'meters':
              convertedLength = length;
              break;
            case 'feet':
              convertedLength = length * 3.28084;
              break;
            case 'kilometers':
              convertedLength = length * 1000;
              break;
            case 'miles':
              convertedLength = length * 0.00062137121212121;
              break;
            case 'nautical-miles':
              convertedLength = length * 0.00053995682073433939625;
              break;
            case 'yards':
              convertedLength = length * 1.0936133333333297735;
              break;
            case 'ussurveyfoot':
              convertedLength = length * 3.2808333333465;
              break;
          }
          return dojoNumber.format(convertedLength, {
            places: 4
          });
        }
    });
});
