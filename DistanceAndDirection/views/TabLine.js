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
    'dojo/query',
    'dojo/keys',
    'dojo/Stateful',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/TooltipDialog',
    'dijit/popup',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/LabelClass',
    'esri/tasks/FeatureSet',
    'esri/geometry/geometryEngine',
    'esri/geometry/Polyline',
    'esri/geometry/Circle',
    'esri/geometry/Point',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/TextSymbol',
    'esri/graphic',
    'esri/units',
    'esri/geometry/webMercatorUtils',
    '../models/LineFeedback',
    '../models/ShapeModel',
    '../views/CoordinateInput',
    '../views/EditOutputCoordinate',
    '../util',
    'dojo/text!../templates/TabLine.html',
    'dijit/form/NumberTextBox'
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
    dojoQuery,
    dojoKeys,
    dojoStateful,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    DijitTooltipDialog,
    DijitPopup,
    EsriGraphicsLayer,
    EsriFeatureLayer,
    EsriLabelClass,
    EsriFeatureSet,
    esriGeometryEngine,
    EsriPolyline,
    EsriCircle,
    EsriPoint,
    EsriSimpleLineSymbol,
    EsriSimpleMarkerSymbol,
    EsriTextSymbol,
    EsriGraphic,
    esriUnits,
    esriWMUtils,
    DrawFeedBack,
    ShapeModel,
    CoordInput,
    EditOutputCoordinate,
    Utils,
    templateStr
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: templateStr,
        baseClass: 'jimu-widget-TabLine',

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

          this.currentLengthUnit = this.lengthUnitDD.get('value');

          this.currentAngleUnit = this.angleUnitDD.get('value');

          this._lineSym = new EsriSimpleLineSymbol(this.lineSymbol);

          this._ptSym = new EsriSimpleMarkerSymbol(this.pointSymbol);

          this._labelSym = new EsriTextSymbol(this.labelSymbol);

          this.map.addLayer(this.getLayer());

          // add extended toolbar
          this.dt = new DrawFeedBack(this.map);
          this.dt.setLineSymbol(this._lineSym);

          this.coordToolStart = new CoordInput({
            appConfig: this.appConfig}, this.startPointCoordsLine);
          this.coordToolStart.inputCoordinate.formatType = 'DD';

          this.coordToolEnd = new CoordInput({
            appConfig: this.appConfig}, this.endPointCoordsLine);
          this.coordToolEnd.inputCoordinate.formatTyp = 'DD';

          this.coordinateFormatStart = new DijitTooltipDialog({
            content: new EditOutputCoordinate(),
            style: 'width: 400px'
          });

          this.lineTypeDDDidChange();
          this.syncEvents();
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
                    'name': 'GeoLength',
                    'type': 'esriFieldTypeDouble',
                    'alias': 'GeoLength'
                  }, {
                    'name': 'LineAngle',
                    'type': 'esriFieldTypeDouble',
                    'alias': 'LineAngle'
                  }]
                };

                  var lblexp = {'labelExpressionInfo': {'value': 'Length: {GeoLength}, Angle: {LineAngle}'}};
                  var lblClass = new EsriLabelClass(lblexp);
                  lblClass.labelPlacement = 'center-along';
                  lblClass.symbol = this._labelSym;

                  var featureCollection = {
                    layerDefinition: layerDefinition,
                    featureSet: new EsriFeatureSet()
                  };

                  this._gl = new EsriFeatureLayer(featureCollection, {
                    showLabels: true
                  });

                  this._gl.setLabelingInfo([lblClass]);

                  return this._gl;
              }
        },

        /*
         * length value change
         */
        lineLengthDidChange: function (r) {
          var frmtdLength = dojoNumber.format(r,{places:2});
          this.lengthInput.set('value', frmtdLength);
        },

        /*
         * angle value change
         */
        lineAngleDidChange: function (r) {
          this.angleInput.set('value', r);
        },

        /*
         * start listening for events
         */
        syncEvents: function () {
          this.dt.watch('startPoint' , dojoLang.hitch(this, function (r, ov, nv) {
            this.coordToolStart.inputCoordinate.set('coordinateEsriGeometry', nv);
            this.dt.addStartGraphic(nv, this._ptSym);
          }));

          this.dt.watch('endPoint' , dojoLang.hitch(this, function (r, ov, nv) {
            this.coordToolEnd.inputCoordinate.set('coordinateEsriGeometry',  nv);
          }));

          this.dt.watch('currentEndPoint', dojoLang.hitch(this, function (r, ov, nv) {
            this.coordToolEnd.inputCoordinate.set('coordinateEsriGeometry', nv);
          }));

          this.coordToolStart.inputCoordinate.watch(
            'outputString',
            dojoLang.hitch(
              this,
              function (r, ov, nv) {
                this.coordToolStart.set('value', nv);
              }
            )
          );

          this.coordToolEnd.inputCoordinate.watch(
            'outputString',
            dojoLang.hitch(
              this,
              function (r, ov, nv) {
                this.coordToolEnd.set('value', nv);
              }
            )
          );

          dojoTopic.subscribe(
            'DD_CLEAR_GRAPHICS',
            dojoLang.hitch(this, this.clearGraphics)
          );

          dojoTopic.subscribe(
            'DD_WIDGET_OPEN',
            dojoLang.hitch(this, this.setGraphicsShown)
          );

          dojoTopic.subscribe(
            'DD_WIDGET_CLOSE',
            dojoLang.hitch(this, this.setGraphicsHidden)
          );

          dojoTopic.subscribe(
            DrawFeedBack.drawnLineLengthDidChange,
            dojoLang.hitch(this, this.lineLengthDidChange)
          );

          dojoTopic.subscribe(
            DrawFeedBack.drawnLineAngleDidChange,
            dojoLang.hitch(this, this.lineAngleDidChange)
          );

          this.own(
            this.dt.on(
              'draw-complete',
              dojoLang.hitch(this, this.feedbackDidComplete)
            ),

            dojoOn(this.coordinateFormatButtonLine, 'click',
              dojoLang.hitch(this, this.coordinateFormatButtonLineWasClicked)
            ),

            dojoOn(
              this.coordinateFormatStart.content.applyButton,
              'click',
              dojoLang.hitch(
                this,
                function () {
                  var fs = this.coordinateFormatStart.content.formats[this.coordinateFormatStart.content.ct];
                  var cfs = fs.defaultFormat;
                  var fv = this.coordinateFormatStart.content.frmtSelect.get('value');
                  if (fs.useCustom) {cfs = fs.customFormat;}
                  this.coordToolStart.inputCoordinate.set(
                    'formatPrefix',
                    this.coordinateFormatStart.content.addSignChkBox.checked
                  );
                  this.coordToolStart.inputCoordinate.set('formatString', cfs);
                  this.coordToolStart.inputCoordinate.set('formatType', fv);
                  this.coordToolEnd.inputCoordinate.set(
                    'formatPrefix',
                    this.coordinateFormatStart.content.addSignChkBox.checked
                  );
                  this.coordToolEnd.inputCoordinate.set('formatString', cfs);
                  this.coordToolEnd.inputCoordinate.set('formatType', fv);
                  this.setCoordLabelStart(fv);
                  this.setCoordLabelEnd(fv);
                  DijitPopup.close(this.coordinateFormatStart);
                }
              )
            ),

            dojoOn(
              this.coordinateFormatStart.content.cancelButton,
              'click',
              dojoLang.hitch(
                this,
                function () {
                  DijitPopup.close(this.coordinateFormatStart);
                }
              )
            ),

            dojoOn(
              this.coordToolEnd,
              'keyup',
              dojoLang.hitch(this, this.coordToolEndKeyWasPressed)
            ),

            dojoOn(
              this.angleInput,
                'keyup',
                dojoLang.hitch(this, this.createManualGraphicDistanceAndBearing)
            ),

            dojoOn(
              this.addPointBtnLine,
              'click',
              dojoLang.hitch(this, this.pointButtonWasClicked)
            ),

            this.lengthUnitDD.on(
              'change',
              dojoLang.hitch(this, this.lengthUnitDDDidChange)
            ),

            this.angleUnitDD.on(
              'change',
              dojoLang.hitch(this, this.angleUnitDDDidChange)
            ),

            this.lineTypeDD.on(
              'change',
              dojoLang.hitch(this, this.lineTypeDDDidChange)
            ),

            this.coordToolStart.on('blur',
              dojoLang.hitch(this, this.coordToolStartDidLoseFocus)
            ),

            this.coordToolEnd.on('blur',
              dojoLang.hitch(this, this.coordToolEndDidLoseFocus)
            )
          );
        },

        /*
         *
         */
        coordinateFormatButtonLineWasClicked: function () {
          this.coordinateFormatStart.content.set('ct', this.coordToolStart.inputCoordinate.formatType);
          DijitPopup.open({
            popup: this.coordinateFormatStart,
            around: this.coordinateFormatButtonLine
          });
        },

        /*
         * catch key press in start point
         */
        coordToolEndKeyWasPressed: function (evt) {

          if (this.lineTypeDD.get('value') !== 'Points') {
            return;
          }

          if (evt.keyCode === dojoKeys.ENTER ) {
            this.coordToolEnd.inputCoordinate.getInputType().then(dojoLang.hitch(this, function (r) {
              this.createManualGraphic();
            }));
          }
        },

        /*
         * get formatted coordinate type
         */
        coordToolStartDidLoseFocus: function () {
          this.coordToolStart.inputCoordinate.isManual = true;
          this.coordToolStart.inputCoordinate.getInputType().then(dojoLang.hitch(this, function (r){
           this.setCoordLabelStart(r.inputType);
           this.dt.addStartGraphic(r.coordinateEsriGeometry, this._ptSym);
         }));
        },



        /*
         *
         */
        coordToolEndDidLoseFocus: function () {
          this.coordToolEnd.inputCoordinate.isManual = true;
          this.coordToolEnd.inputCoordinate.getInputType().then(
            dojoLang.hitch(this, function (r) {
              this.setCoordLabelEnd(r.inputType);
            }
          ));
        },

        /*
         *
         */
        setCoordLabelEnd: function (toType) {

          this.lineEndPointLabel.innerHTML = dojoString.substitute(
            'End Point (${crdType})', {
              crdType: toType
            }
          );
        },

        /*
         *
         */
        setCoordLabelStart: function (toType) {
          this.lineStartPointLabel.innerHTML = dojoString.substitute(
            'Start Point (${crdType})', {
              crdType: toType
            }
          );
        },

        /*
         * update the UI to reflect current state
         */
        lineTypeDDDidChange: function () {

          if (this.lineTypeDD.get('value') === 'Points') {
            this.coordToolEnd.set('disabled', false);
            this.angleInput.set('disabled', true);
            this.lengthInput.set('disabled', true);
          } else {
            this.coordToolEnd.set('disabled', true);
            this.angleInput.set('disabled', false);
            this.lengthInput.set('disabled', false);
          }
        },

        /*
         * Button click event, activate feedback tool
         */
        pointButtonWasClicked: function () {
          this.map.disableMapNavigation();
          this.dt.activate('polyline');
          dojoDomClass.toggle(this.addPointBtnLine, 'jimu-state-active');
        },

        /*
         *
         */
        lengthUnitDDDidChange: function () {
          this.currentLengthUnit = this.lengthUnitDD.get('value');
          this.dt.set('lengthUnit', this.currentLengthUnit);
          if (this.currentLine) {
            this.lengthInput.set('value',this.currentLine.getFormattedLength(this.currentLengthUnit));
          }
        },

        /*
         *
         */
        angleUnitDDDidChange: function () {
          this.currentAngleUnit = this.angleUnitDD.get('value');
          this.dt.set('angleUnit', this.currentAngleUnit);
          if (this.currentLine) {
            this.angleInput.set('value', this.currentLine.getAngle(this.currentAngleUnit));
          }
        },

        /*
         * pass results of feedback to the shapemodel
         */
        feedbackDidComplete: function (results) {

          this.currentLine = new ShapeModel(results);
          this.currentLine.graphic = new EsriGraphic(
            this.currentLine.wmGeometry,
            this._lineSym, {
              'GeoLength': this.lengthInput.get('value'),
              'LineAngle': this.angleInput.get('value')
            }
          );

          //this.lengthUnitDDDidChange();
          //this.angleUnitDDDidChange();

          this._gl.add(this.currentLine.graphic);
          this._gl.refresh();
          this.emit('graphic_created', this.currentLine);

          this.map.enableMapNavigation();

          this.dt.deactivate();
          this.dt.removeStartGraphic();

          dojoDomClass.toggle(this.addPointBtnLine, 'jimu-state-active');

        },

        /*
         *
         */
         createManualGraphic: function () {
           this._gl.remove(this.startGraphic);

           var stPt = this.coordToolStart.inputCoordinate.coordinateEsriGeometry;
           var endPt = this.coordToolEnd.inputCoordinate.coordinateEsriGeometry;

           var newLine = new EsriPolyline();
           newLine.addPath([stPt, endPt]);

           this.map.setExtent(newLine.getExtent().expand(3));

           this.feedbackDidComplete({geometry: newLine, geographicGeometry: newLine});
         },

         /*
          *
          */
         createManualGraphicDistanceAndBearing: function (evt) {

           if (evt.keyCode !== dojoKeys.ENTER ) {return;}

           this._gl.remove(this.startGraphic);

            var stPt = this.coordToolStart.inputCoordinate.coordinateEsriGeometry;

            var l = this.lengthInput.get('value');
            var ang = -Math.abs(this.angleInput.get('value'));

            var tempcircle = new EsriCircle(stPt, {
              geodesic:true,
              radius: l
            });

            var fpc =  new EsriPoint(
              tempcircle.rings[0][0][0],
              tempcircle.rings[0][0][1],
              tempcircle.spatialReference
            );

            var newLine = new EsriPolyline();
            newLine.addPath([stPt, fpc]);

            var rotatedLine = esriGeometryEngine.rotate(
              newLine, ang, stPt);

            this.feedbackDidComplete({
              geometry: rotatedLine,
              geographicGeometry: rotatedLine
            });
         },

        /*
         *
         */
        clearGraphics: function () {
          if (this._gl) {
            this._gl.clear();
            this.dt.removeStartGraphic();
            this.coordToolStart.clear();
            this.coordToolEnd.clear();
            this.lengthInput.set('value', 0);
            this.angleInput.set('value', 0);
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
        }
    });
});
