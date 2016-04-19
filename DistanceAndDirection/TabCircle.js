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
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/TitlePane',
  'esri/layers/GraphicsLayer',
  'esri/geometry/geometryEngine',
  'esri/symbols/SimpleFillSymbol',
  'esri/graphic',
  'esri/units',
  'esri/geometry/webMercatorUtils',
  './Feedback',
  './ShapeModel',
  'dojo/text!./templates/TabCircle.html'
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
  dijitWidgetBase,
  dijitTemplatedMixin,
  dijitWidgetsInTemplate,
  dijitTitlePane,
  EsriGraphicsLayer,
  esriGeometryEngine,
  EsriSimpleFillSymbol,
  EsriGraphic,
  esriUnits,
  esriWMUtils,
  DrawFeedBack,
  ShapeModel,
  templateStr
  ) {
  'use strict';
  return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
    templateString: templateStr,
    baseClass: 'jimu-widget-TabCircle',

    /**
     * class constructor
     **/
    constructor: function (args) {
      dojoDeclare.safeMixin(this, args);
    },

    /**
     * dijit post create
     **/
    postCreate: function () {
      this.useCalculatedDistance = false;

      this.currentLengthUnit = this.lengthUnitDD.get('value');

      this._lengthLayer = new EsriGraphicsLayer();

      this._gl = new EsriGraphicsLayer();

      this._circleSym = new EsriSimpleFillSymbol(this.circlesymbol);

      this.map.addLayers([this._gl, this._lengthLayer]);

      // add extended toolbar
      this.dt = new DrawFeedBack(this.map);

      this.dt.set('lengthLayer', this._lengthLayer);

      this.syncEvents();
    },

    /**
     * Start up event listeners
     **/
    syncEvents: function () {

      this.distCalcControl.watch("open", dojoLang.hitch(this, this.distCalcDidExpand));
      dojoTopic.subscribe('DD_CLEAR_GRAPHICS', dojoLang.hitch(this, this.clearGraphics));
      dojoTopic.subscribe('DD_WIDGET_OPEN', dojoLang.hitch(this, this.setGraphicsShown));
      dojoTopic.subscribe('DD_WIDGET_CLOSE', dojoLang.hitch(this, this.setGraphicsHidden));

      this.own(
        this.dt.on(
          'draw-complete',
          dojoLang.hitch(this, this.feedbackDidComplete)
        ));

      this.own(dojoOn(
        this.addPointBtn,
        'click',
        dojoLang.hitch(this, this.pointButtonWasClicked)
      ));

      this.own(this.lengthUnitDD.on(
        'change',
        dojoLang.hitch(this, this.lengthUnitDDDidChange)
      ));

      this.own(this.creationType.on(
        'change',
        dojoLang.hitch(this, this.creationTypeDidChange)
      ));

      this.own(dojoOn(
        this.timeInput,
        'change',
        dojoLang.hitch(this, this.timeInputDidChange)
      ));

      this.own(dojoOn(
        this.distanceInput,
        'change',
        dojoLang.hitch(this, this.distanceInputDidChange)
      ));

      this.own(this.distanceUnitDD.on(
        'change',
        dojoLang.hitch(this, this.distanceInputDidChange)
      ));

      this.own(this.timeUnitDD.on(
        'change',
        dojoLang.hitch(this, this.timeInputDidChange)
      ));

      this.own(dojoOn(
        this.lengthInput,
        'change',
        dojoLang.hitch(
          this,
          this.lengthInputDidChange
        )
      ));
    },

    /**
     *
     **/
    distCalcDidExpand: function () {
      if (this.distCalcControl.get('open')) {
        this.lengthInput.disabled = 'disabled';
      } else {
        this.lengthInput.disabled = false;
      }
    },

    /**
     *
     **/
    lengthInputDidChange: function () {
      if (this.lengthInput.value && this.lengthInput.value <= 0){
        this.useCalculatedDistance = false;
      }
    },

    /**
     *
     **/
    timeInputDidChange: function () {
      console.log("Time Input Did Change");
      this.currentTimeInSeconds = this.timeInput.value  * this.timeUnitDD.value;
      this.getCalculatedDistance();
    },

    /**
     *
     **/
    distanceInputDidChange: function () {

      var currentRateInMetersPerSecond = (this.distanceInput.value *
        this.distanceUnitDD.value.split(';')[0]) / this.distanceUnitDD.value.split(';')[1];
      console.log(dojoString.substitute("Rate in Meters Per Second = ${crmps}", {
          crmps: currentRateInMetersPerSecond
        })
      );
      this.currentDistanceInMeters = currentRateInMetersPerSecond;
      this.getCalculatedDistance();
    },

    /**
     *
     **/
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
      } else {
        this.calculatedRadiusInMeters = null;
        this.useCalculatedDistance = true;
      }
    },

    /**
     * Button click event, activate feedback tool
     **/
    pointButtonWasClicked: function () {
      this.map.disableMapNavigation();
      if (this.lengthInput.value && this.lengthInput.value > 0){
        this.dt.activate('point');
      } else {
        this.dt.activate('circle');
      }

      dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
    },

    /**
     *
     **/
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

    /**
     *
     **/
    creationTypeDidChange: function() {
      this.lengthUnitDDDidChange();
    },

    /**
     *
     **/
    feedbackDidComplete: function (results) {

      results.calculatedDistance = this.calculatedRadiusInMeters;

      this.currentCircle = new ShapeModel(results);

      this.currentCircle.graphic = new EsriGraphic(
        this.currentCircle.wmGeometry,
        this._circleSym
      );

      dojoDomAttr.set(
        this.startPointCoords,
        'value',
        this.currentCircle.formattedStartPoint
      );

      if (!this.useCalculatedDistance) {
        this.lengthUnitDDDidChange();
      }

      this._gl.add(this.currentCircle.graphic);

      if (this._lengthLayer.graphics.length > 0) {
        var tg = dojoLang.clone(this._lengthLayer.graphics[0].geometry);
        var ts = dojoLang.clone(this._lengthLayer.graphics[0].symbol);
        this._gl.add(new EsriGraphic(tg, ts));
        this._lengthLayer.clear();
      }

      this.emit('graphic_created', this.currentCircle);

      this.map.enableMapNavigation();

      this.dt.deactivate();

      dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');

    },

    /**
     * Remove graphics and reset values
     **/
    clearGraphics: function () {
      if (this._gl) {
        // graphic layers
        this._gl.clear();
        this._lengthLayer.clear();

        // ui controls
        this.useCalculatedDistance = false;
        this.currentCircle = null;
        dojoDomAttr.set(this.startPointCoords, 'value', '');
        dojoDomAttr.set(this.lengthInput, 'value', '');
        dojoDomAttr.set(this.timeInput, 'value', '');
        dojoDomAttr.set(this.distanceInput, 'value', '');
      }
    },

    /**
     *
     **/
    setGraphicsHidden: function () {
      if (this._gl) {
        this._gl.hide();
      }
    },

    /**
     *
     **/
    setGraphicsShown: function () {
      if (this._gl) {
        this._gl.show();
      }
    }

  });
});