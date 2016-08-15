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
  'esri/layers/FeatureLayer',
  'esri/graphicsUtils',
  'esri/geometry/geometryEngine',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/TextSymbol',
  'esri/graphic',
  'esri/units',
  'esri/geometry/webMercatorUtils',
  'esri/geometry/Circle',
  'esri/tasks/FeatureSet',
  'esri/layers/LabelClass',
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
  EsriFeatureLayer,
  esriGraphicsUtils,
  esriGeometryEngine,
  EsriSimpleFillSymbol,
  EsriSimpleMarkerSymbol,
  EsriTextSymbol,
  EsriGraphic,
  esriUnits,
  esriWMUtils,
  EsriCircle,
  EsriFeatureSet,
  EsriLabelClass,
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

      this._circleSym = new EsriSimpleFillSymbol(this.circleSymbol);

      this._ptSym = new EsriSimpleMarkerSymbol(this.pointSymbol);

      this._labelSym = new EsriTextSymbol(this.labelSymbol);

      this.map.addLayer(this.getLayer());

      // add extended toolbar
      this.dt = new DrawFeedBack(this.map);
      this.dt.setFillSymbol(this._circleSym);

      this.coordTool = new CoordInput({appConfig: this.appConfig}, this.startPointCoords);
      this.coordTool.inputCoordinate.formatType = 'DD';

      this.coordinateFormat = new DijitTooltipDialog({
        content: new EditOutputCoordinate(),
        style: 'width: 400px'
      });

      this.syncEvents();
    },

    /*
     * upgrade graphicslayer so we can use the label params
     */
    getLayer: function () {
      if (!this._gl) {
        var layerDefinition = {
          'id': 'circleLayer',
          'geometryType': 'esriGeometryPolygon',
          'fields': [{
              'name': 'RADIUS',
              'type': 'esriFieldTypeDouble',
              'alias': 'Radius'
            }]
          };

          var lblexp = {'labelExpressionInfo': {'value': 'Radius: {RADIUS}'}};
          var lblClass = new EsriLabelClass(lblexp);
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
     * Start up event listeners
     */
    syncEvents: function () {

      this.distCalcControl.watch('open',
        dojoLang.hitch(this, this.distCalcDidExpand)
      );

      this.dt.watch('length', dojoLang.hitch(this, function (n, ov, nv) {
        this.circleLengthDidChange(nv);
        //this.lengthInput.set('value', nv);
      }));

      this.dt.watch(
        'startPoint',
        dojoLang.hitch(this, function (n, ov, nv) {
          if (nv !== null) {
              this.coordTool.inputCoordinate.set('coordinateEsriGeometry', nv);
              this.dt.addStartGraphic(nv, this._ptSym);
          }
          else {
              this.coordTool.inputCoordinate.set('coordinateEsriGeometry', null);
          }
      }));

      this.coordTool.inputCoordinate.watch(
        'outputString',
        dojoLang.hitch(
          this,
          function (r, ov, nv) {
            this.coordTool.set('value', nv);
          }
        )
      );

      dojoOn(
        this.coordTool,
        'keyup',
        dojoLang.hitch(this, this.startInputKeyPressed)
      );

      dojoTopic.subscribe(
        'DD_CLEAR_GRAPHICS',
        dojoLang.hitch(this, this.clearGraphics)
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

        dojoOn(this.lengthInput, 'keyup',
          dojoLang.hitch(this, this.distanceInputKeyWasPressed)
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
          this.removeManualGraphic();
          this.setGraphic(true);
          //dojoTopic.publish('MANUAL_CIRCLE_RADIUS_INPUT_COMPLETE', this.lengthInput.value);
      }
      else {
          if (this.lengthInput.value !== '') {
              dojoTopic.publish('MANUAL_CIRCLE_RADIUS_INPUT', this);
              this.createManualGraphic();
          }
      }
    },

    /*
     *
     */
    startInputKeyPressed: function (evt) {
          if (evt.keyCode === dojoKeys.ENTER) {
              this.dt.addStartGraphic(this.coordTool.inputCoordinate, this._ptSym);
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
        this.setGraphic(false);
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
    createManualGraphic: function () {
        if (this.tempGraphic != null) {
            this._gl.remove(this.tempGraphic);
        }

        var stPt = this.coordTool.inputCoordinate.coordinateEsriGeometry;

        var distInMeters = this.utils.convertToMeters(
          this.lengthInput.value,
          this.lengthUnitDD.get('value')
        );

        var tempCircle = new EsriCircle(stPt, {
            radius: distInMeters,
            geodesic: true
        });

        this.tempGraphic = new EsriGraphic(
          tempCircle,
          this._circleSym,
          {
            'RADIUS': this.lengthInput.value
          }
        );

        this._gl.add(this.tempGraphic);

        this._gl.refresh();
    },

    /*
     *
     */
    removeManualGraphic: function () {
        if (this.tempGraphic != null) {
            this._gl.remove(this.tempGraphic);
        }

        this.dt.removeStartGraphic();
    },

    /*
     *
     */
    setGraphic: function (isManual) {

      var results = {};

      this.map.enableMapNavigation();

      this.dt.deactivate();

      this.dt.removeStartGraphic();

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
        results.calculatedDistance = dojoNumber.parse(
          this.lengthInput.value*2, {
            places:2
          }
        );
      } else {
          results.calculatedDistance = dojoNumber.parse(
            this.lengthInput.value, {
              places: '0,99'
            }
          );
      }

      results.calculatedDistance = this.utils.convertToMeters(
        results.calculatedDistance,
        this.lengthUnitDD.get('value')
      );

      results.geometry = this.coordTool.inputCoordinate.coordinateEsriGeometry;
      this.currentCircle = new ShapeModel(results);

      this.currentCircle.graphic = new EsriGraphic(
        this.currentCircle.wmGeometry,
        this._circleSym,
        {
          'RADIUS': results.calculatedDistance
        }
      );

      this._gl.add(this.currentCircle.graphic);

      if (this.coordTool.inputCoordinate.isManual) {
        this.map.setExtent(this.currentCircle.wmGeometry.getExtent().expand(3));
      } else {
        this._gl.refresh();
      }

      this.emit('graphic_created', this.currentCircle);
      this.clearUI(false);
    },

    /*
     * Remove graphics and reset values
     */
    clearGraphics: function () {
      if (this._gl) {
        // graphic layers
        this._gl.clear();
        this._gl.refresh();

        // ui controls
        this.clearUI(false);
      }
    },

    /*
     * reset ui controls
     */
    clearUI: function (keepCoords) {
      if (!keepCoords){
        this.coordTool.clear();
      }
      this.dt.set('startPoint', null);
      this.useCalculatedDistance = false;
      this.currentCircle = null;

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
