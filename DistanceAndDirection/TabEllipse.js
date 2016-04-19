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
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/graphic',
    'esri/units',
    'esri/geometry/webMercatorUtils',
    './Feedback',
    './ShapeModel',
    'dojo/text!./templates/TabEllipse.html'
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
    EsriSimpleLineSymbol,
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
        baseClass: 'jimu-widget-TabEllipse',

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
          this.currentAngleUnit = this.angleUnitDD.get('value');
          this.currentLengthUnit = this.lengthUnitDD.get('value');

          this._lengthLayer = new EsriGraphicsLayer();
          this._gl = new EsriGraphicsLayer();
          this.map.addLayers([this._gl, this._lengthLayer]);

          this._circleSym = new EsriSimpleFillSymbol(this.circlesymbol);

          // add extended toolbar
          this.dt = new DrawFeedBack(this.map);
          this.dt.set('lengthLayer', this._lengthLayer);

          this.syncEvents();
        },

        /**
         *
         **/
        syncEvents: function () {
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

          this.own(this.ellipseType.on(
            'change',
            dojoLang.hitch(this, this.ellipseTypeChangeHandler)
          ))

          this.own(this.angleUnitDD.on(
            'change',
            dojoLang.hitch(this, this.angleUnitDDDidChange)
          ));

          this.own(this.lengthUnitDD.on(
            'change',
            dojoLang.hitch(this, this.lengthUnitDDDidChange)
          ))

        },

        /**
         * Button click event, activate feedback tool
         **/
        pointButtonWasClicked: function () {
          this.map.disableMapNavigation();
          this.dt.activate('polyline');
          dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
        },

        /**
         *
         **/
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

        /**
         *
         **/
        ellipseTypeChangeHandler: function () {
          var majorAxisLength = this.ellipseType.get('value') === 'full' ?
            this.currentEllipse.geometry.majorAxisLength * 2 :
            this.currentEllipse.geometry.majorAxisLength
          dojoDomAttr.set(
            this.majorAxisInput,
            'value',
            this._getFormattedLength(majorAxisLength)
          );
        },

        /**
         *
         **/
        angleUnitDDDidChange: function () {
          this.currentAngleUnit = this.angleUnitDD.get('value');

          if (this.currentEllipse) {
            dojoDomAttr.set(
              this.angleInput,
              'value',
              this.currentEllipse.getAngle(this.currentAngleUnit));
          }
        },

        /**
         *
         **/
        feedbackDidComplete: function (results) {
          this.currentEllipse = new ShapeModel(results);
          this.currentEllipse.graphic = new EsriGraphic(
            this.currentEllipse.wmGeometry,
            this._circleSym
          );

          dojoDomAttr.set(
            this.startPointCoords,
            'value',
            this.currentEllipse.formattedStartPoint
          );

          this.lengthUnitDDDidChange();
          this.angleUnitDDDidChange();

          this._gl.add(this.currentEllipse.graphic);
          ///this.map.setExtent(this.currentEllipse.graphic.geometry.getExtent());
          if (this._lengthLayer.graphics.length > 0) {
            var tg = dojoLang.clone(this._lengthLayer.graphics[0].geometry);
            var ts = dojoLang.clone(this._lengthLayer.graphics[0].symbol);
            this._gl.add(new EsriGraphic(tg, ts));
            this._lengthLayer.clear();
          }

          this.emit('graphic_created', this.currentEllipse);

          this.map.enableMapNavigation();
          this.dt.deactivate();
          dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
        },

        /**
         *
         **/
        clearGraphics: function () {
          if (this._gl) {
            this._gl.clear();
            this._lengthLayer.clear();
            dojoDomAttr.set(this.startPointCoords, 'value', '');
            dojoDomAttr.set(this.majorAxisInput, 'value', '');
            dojoDomAttr.set(this.minorAxisInput, 'value', '');
            dojoDomAttr.set(this.angleInput, 'value', '');
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
        },

        _getFormattedLength: function (length) {
          var convertedLength = length;
          switch (this.currentLengthUnit) {
            case "meters":
              convertedLength = length;
              break;
            case "feet":
              convertedLength = length * 3.28084;
              break;
            case "kilometers":
              convertedLength = length * 1000;
              break;
            case "miles":
              convertedLength = length * 0.00062137121212121;
              break;
            case "nautical-miles":
              convertedLength = length * 0.00053995682073433939625;
              break;
            case "yards":
              convertedLength = length * 1.0936133333333297735;
              break;
            case "ussurveyfoot":
              convertedLength = length * 3.2808333333465;
              break;
          }
          return dojoNumber.format(convertedLength, {
            places:4
          });          ;

        }
    });
});
