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
      //this.uid = args.id || dijitRegistry.getUniqueId('LineTab');
    },

    /**
     * dijit post create
     **/
    postCreate: function () {
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

    syncEvents: function () {
      dojoTopic.subscribe('GR_CLEAR_GRAPHICS', dojoLang.hitch(this, this.clearGraphics));
      dojoTopic.subscribe('GR_WIDGET_OPEN', dojoLang.hitch(this, this.setGraphicsShown));
      dojoTopic.subscribe('GR_WIDGET_CLOSE', dojoLang.hitch(this, this.setGraphicsHidden));

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
      ))
    },

    /**
     * Button click event, activate feedback tool
     **/
    pointButtonWasClicked: function () {
      this.map.disableMapNavigation();
      this.dt.activate('circle');
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
        var length = this.creationType.get('value') === "Radius" ? currentLength : currentLength * 2;
        dojoDomAttr.set(
          this.lengthInput,
          'value',
          this.currentCircle.formatLength(length)
        );
      }
    },

    creationTypeDidChange: function() {
      this.lengthUnitDDDidChange();
    },

    feedbackDidComplete: function (results) {

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

      this.lengthUnitDDDidChange();

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

    clearGraphics: function () {
      if (this._gl) {
        this._gl.clear();
        this._lengthLayer.clear();
        dojoDomAttr.set(this.startPointCoords, 'value', '');
        dojoDomAttr.set(this.lengthInput, 'value', '');
      }
    },

    setGraphicsHidden: function () {
      if (this._gl) {
        this._gl.hide();
      }
    },

    setGraphicsShown: function () {
      if (this._gl) {
        this._gl.show();
      }
    }

  });
});
