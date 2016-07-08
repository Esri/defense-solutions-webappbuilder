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
  'dijit/_WidgetsInTemplateMixin',
  'dijit/TitlePane',
  'dijit/TooltipDialog',
  'dijit/popup',
  'esri/layers/GraphicsLayer',
  'esri/graphicsUtils',
  'esri/geometry/geometryEngine',
  'esri/symbols/SimpleFillSymbol',
  'esri/graphic',
  'esri/units',
  'esri/geometry/webMercatorUtils',
  'esri/geometry/Circle',
  '../models/CircleFeedback',
  '../models/ShapeModel',
  '../views/CoordinateInput',
  '../views/EditOutputCoordinate',
  '../util',
  'dojo/text!../templates/TabCircle.html'
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
  dijitWidgetsInTemplate,
  dijitTitlePane,
  DijitTooltipDialog,
  DijitPopup,
  EsriGraphicsLayer,
  esriGraphicsUtils,
  esriGeometryEngine,
  EsriSimpleFillSymbol,
  EsriGraphic,
  esriUnits,
  esriWMUtils,
  EsriCircle,
  DrawFeedBack,
  ShapeModel,
  CoordInput,
  EditOutputCoordinate,
  Util,
  templateStr
  ) {
  'use strict';
  return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
    templateString: templateStr,
    baseClass: 'jimu-widget-TabCircle',

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

      this.utils = new Util(this.appConfig.geometryService);

      this.useCalculatedDistance = false;

      this.currentLengthUnit = this.lengthUnitDD.get('value');

      this._lengthLayer = new EsriGraphicsLayer();

      this._gl = new EsriGraphicsLayer();

      this._circleSym = new EsriSimpleFillSymbol(this.circleSymbol);

      this.map.addLayers([this._gl, this._lengthLayer]);

      // add extended toolbar
      this.dt = new DrawFeedBack(this.map);
      this.dt.setFillSymbol(this._circleSym);
      this.dt.set('lengthLayer', this._lengthLayer);

      this.coordTool = new CoordInput({appConfig: this.appConfig}, this.startPointCoords);
      this.coordTool.inputCoordinate.formatType = 'DD';

      this.coordinateFormat = new DijitTooltipDialog({
        content: new EditOutputCoordinate(),
        style: 'width: 400px'
      });

      this.syncEvents();
    },

    /*
     * Start up event listeners
     */
    syncEvents: function () {

      this.distCalcControl.watch('open',
        dojoLang.hitch(this, this.distCalcDidExpand)
      );

      dojoTopic.subscribe('DD_CLEAR_GRAPHICS',
        dojoLang.hitch(this, this.clearGraphics)
      );

      dojoTopic.subscribe(DrawFeedBack.DD_CIRCLE_LENGTH_DID_CHANGE,
        dojoLang.hitch(this, this.circleLengthDidChange)
      );

      dojoTopic.subscribe('COORDINATE_INPUT_TYPE_CHANGE',
        dojoLang.hitch(this, this.setGraphic)
      );

      dojoTopic.subscribe('COORDINATE_INPUT_FORMAT_CHANGE',
        dojoLang.hitch(this, function () {
          this.coordTool.inputCoordinate.validateOnInput = false;
          this.coordTool.set('value', this.coordTool.inputCoordinate.outputString);
        })
      );

      this.own(
        this.dt.on('draw-complete',
          dojoLang.hitch(this, this.feedbackDidComplete)
        ),

        this.coordTool.on('blur',
          dojoLang.hitch(this, this.coordToolDidLoseFocus)
        ),

        this.lengthUnitDD.on('change',
          dojoLang.hitch(this, this.lengthUnitDDDidChange)
        ),

        this.creationType.on('change',
          dojoLang.hitch(this, this.creationTypeDidChange)
        ),

        this.distanceUnitDD.on('change',
          dojoLang.hitch(this, this.distanceInputDidChange)
        ),

        this.timeUnitDD.on('change',
          dojoLang.hitch(this, this.timeInputDidChange)
        ),

        dojoOn(this.coordinateFormatButton, 'click',
          dojoLang.hitch(this, this.coordinateFormatButtonWasClicked)
        ),

        dojoOn(this.addPointBtn, 'click',
          dojoLang.hitch(this, this.pointButtonWasClicked)
        ),

        dojoOn(this.timeInput, 'change',
          dojoLang.hitch(this, this.timeInputDidChange)
        ),

        dojoOn(this.distanceInput, 'change',
          dojoLang.hitch(this, this.distanceInputDidChange)
        ),

        dojoOn(this.distanceInput, 'keyup',
          dojoLang.hitch(this, this.distanceInputKeyWasPressed)
        ),

        dojoOn(this.lengthInput, 'change',
          dojoLang.hitch(this, this.lengthInputDidChange)
        ),

        dojoOn(this.coordinateFormat.content.applyButton, 'click',
          dojoLang.hitch(this, function () {
            var fs = this.coordinateFormat.content.formats[this.coordinateFormat.content.ct];
            var cfs = fs.defaultFormat;
            var fv = this.coordinateFormat.content.frmtSelect.get('value');
            if (fs.useCustom) {
              cfs = fs.customFormat;
            }
            this.coordTool.inputCoordinate.set('formatPrefix', this.coordinateFormat.content.addSignChkBox.checked);
            this.coordTool.inputCoordinate.set('formatString', cfs);
            this.coordTool.inputCoordinate.set('formatType', fv);
            this.setCoordLabel(fv);

            DijitPopup.close(this.coordinateFormat);
          }
        )),

        dojoOn(this.coordinateFormat.content.cancelButton, 'click',
          dojoLang.hitch(this, function () {
            DijitPopup.close(this.coordinateFormat);
          }
        ))
      );
    },

    /*
     *
     */
    circleLengthDidChange: function (l) {
      var fl = dojoNumber.format(l, {places: 2});
      dojoDomAttr.set(
        this.lengthInput,
        'value',
        fl
      );
    },

    /*
     *
     */
    coordToolDidLoseFocus: function () {
      this.coordTool.inputCoordinate.isManual = true;
      //this.coordTool.set('validateOnInput', true);
      this.coordTool.inputCoordinate.getInputType().then(dojoLang.hitch(this, function (r){
       this.setCoordLabel(r.inputType);
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
     *
     */
    distCalcDidExpand: function () {
      if (this.distCalcControl.get('open')) {
        this.lengthInput.disabled = 'disabled';
      } else {
        this.lengthInput.disabled = false;
      }
    },

    /*
     *
     */
    lengthInputDidChange: function () {
      if (this.lengthInput.value && this.lengthInput.value <= 0){
        this.useCalculatedDistance = false;
      }

      if (this.coordTool.inputCoordinate) {
        this.setGraphic();
      }
    },

    /*
     *
     */
    timeInputDidChange: function () {
      this.currentTimeInSeconds = this.timeInput.value  * this.timeUnitDD.value;
      this.getCalculatedDistance();
    },

    /*
     * Rate Input key up event handler
     */
    distanceInputKeyWasPressed: function (evt) {
      if (evt.keyCode === dojoKeys.ENTER) {
        this.setGraphic();
      }
    },

    /*
     *
     */
    distanceInputDidChange: function () {

      var currentRateInMetersPerSecond = (
        this.distanceInput.value *
        this.distanceUnitDD.value.split(';')[0]
      ) / this.distanceUnitDD.value.split(';')[1];

      this.currentDistanceInMeters = currentRateInMetersPerSecond;
      this.getCalculatedDistance();
    },

    /*
     *
     */
    getCalculatedDistance: function () {
      if ((this.currentTimeInSeconds && this.currentTimeInSeconds > 0) &&
        (this.currentDistanceInMeters && this.currentDistanceInMeters > 0)) {
        this.calculatedRadiusInMeters = this.currentTimeInSeconds * this.currentDistanceInMeters;
        this.useCalculatedDistance = true;
        var fr = 0;
        switch (this.currentLengthUnit){
          case 'feet':
            fr = this.calculatedRadiusInMeters * 3.28084;
            break;
          case 'meters':
            fr = this.calculatedRadiusInMeters;
            break;
          case 'yards':
            fr = this.calculatedRadiusInMeters * 1.09361;
            break;
          case 'kilometers':
            fr = this.calculatedRadiusInMeters * 0.001;
            break;
          case 'miles':
            fr = this.calculatedRadiusInMeters * 0.000621371;
            break;
          case 'nautical-miles':
            fr = this.calculatedRadiusInMeters * 0.000539957;
            break;
        }
        dojoDomAttr.set(
          this.lengthInput,
          'value',
          fr
        );
        //this.setGraphic();
      } else {
        this.calculatedRadiusInMeters = null;
        this.useCalculatedDistance = true;
      }

    },

    /*
     * Button click event, activate feedback tool
     */
    pointButtonWasClicked: function () {
      this.map.disableMapNavigation();
      this.dt.set('isDiameter', this.creationType.get('value') === 'Diameter');
      if (this.distCalcControl.get('open')) {
        this.dt.activate('point');
      } else {
        this.dt.activate('polyline');
      }

      dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
    },

    /*
     *
     */
    lengthUnitDDDidChange: function () {
      this.currentLengthUnit = this.lengthUnitDD.get('value');
      this.dt.set('lengthUnit', this.currentLengthUnit);
      if (this.currentCircle) {
        var currentLength = this.currentCircle.getLength(this.currentLengthUnit);
        var length = this.creationType.get('value') === 'Radius' ?
          currentLength : currentLength * 2;
        dojoDomAttr.set(
          this.lengthInput,
          'value',
          this.currentCircle.formatLength(length)
        );
      }
    },

    /*
     *
     */
    creationTypeDidChange: function() {
      this.lengthUnitDDDidChange();
      this.radiusDiameterLabel.innerHTML = this.creationType.get('value');
    },

    /*
     *
     */
    feedbackDidComplete: function (results) {
      var centerPoint = results.geometry.center;
      if (!centerPoint) {
        centerPoint = esriWMUtils.webMercatorToGeographic(results.geometry);
      } else {
        var cnvrtdLength = this.utils.convertMetersToUnits(
          results.geometry.radius,
          this.lengthUnitDD.get('value')
        );
        dojoDomAttr.set(this.lengthInput, 'value', cnvrtdLength);
      }
      this.coordTool.inputCoordinate.isManual = false;
      this.coordTool.inputCoordinate.hasError = false;
      this.coordTool.inputCoordinate.set('coordinateEsriGeometry', centerPoint);

    },

    /*
     *
     */
    setCoordLabel: function (toType) {
      this.coordInputLabel.innerHTML = dojoString.substitute(
        'Center Point (${crdType})', {
          crdType: toType
        }
      );
    },

    /*
     *
     */
    setGraphic: function (isManual) {

      var results = {};

      this.map.enableMapNavigation();

      this.dt.deactivate();

      dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');

      if (this.coordTool.inputCoordinate.hasError) {
        return;
      }

      if (!this.coordTool.inputCoordinate.isManual) {
        this.coordTool.set('validateOnInput', false);
        this.coordTool.set('value', this.coordTool.inputCoordinate.outputString);
        this.setCoordLabel(this.coordTool.inputCoordinate.formatType);
      }

      if (!this.lengthInput.value || this.lengthInput.value <= 0) {return;}

      if (this.coordTool.inputCoordinate.isManual && this.creationType.get('value') === 'Diameter') {
        results.calculatedDistance = parseInt(this.lengthInput.value*2, 10);
      } else {
        results.calculatedDistance = parseInt(this.lengthInput.value, 10);
      }

      results.calculatedDistance = this.utils.convertToMeters(
        results.calculatedDistance,
        this.lengthUnitDD.get('value')
      );

      results.geometry = this.coordTool.inputCoordinate.coordinateEsriGeometry;
      this.currentCircle = new ShapeModel(results);

      this.currentCircle.graphic = new EsriGraphic(
        this.currentCircle.wmGeometry,
        this._circleSym
      );

      this._gl.add(this.currentCircle.graphic);

      if (this._lengthLayer.graphics.length > 0) {
        var tg = dojoLang.clone(this._lengthLayer.graphics[0].geometry);
        var ts = dojoLang.clone(this._lengthLayer.graphics[0].symbol);
        this._gl.add(new EsriGraphic(tg, ts));
        this._lengthLayer.clear();
      }

      if (this.coordTool.inputCoordinate.isManual) {
        this.map.setExtent(this.currentCircle.wmGeometry.getExtent().expand(3));
      }

      this.emit('graphic_created', this.currentCircle);
      this.clearUI(true);
    },

    /*
     * Remove graphics and reset values
     */
    clearGraphics: function () {
      if (this._gl) {
        // graphic layers
        this._gl.clear();
        this._lengthLayer.clear();

        // ui controls
        this.clearUI(false);
      }
    },

    /*
     * reset ui controls
     */
    clearUI: function (keepCoords) {
      this.useCalculatedDistance = false;
      this.currentCircle = null;
      if (!keepCoords){
        this.coordTool.clear();
      }

      dojoDomClass.remove(this.addPointBtn, 'jimu-state-active');
      dojoDomAttr.set(this.startPointCoords, 'value', '');
      dojoDomAttr.set(this.lengthInput, 'value', '');
      dojoDomAttr.set(this.timeInput, 'value', '');
      dojoDomAttr.set(this.distanceInput, 'value', '');
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
