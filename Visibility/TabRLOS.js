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
  'dijit/TooltipDialog',
  'dijit/popup',
  'esri/layers/GraphicsLayer',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/graphic',
  'esri/toolbars/draw',
  './CoordinateInput',
  './EditOutputCoordinate',
  'dojo/text!./templates/TabRLOS.html'
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
  DijitTooltipDialog,
  DijitPopup,
  EsriGraphicsLayer,
  EsriSimpleMarkerSymbol,  
  Graphic,
  Draw,
  CoordInput,
  EditOutputCoordinate,
  templateStr
  ) {
  'use strict';
  return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
    templateString: templateStr,
    baseClass: 'jimu-widget-TabRLOS',

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

        this._rlosGL = new EsriGraphicsLayer();
        this.map.addLayers([this._rlosGL]);

        this._pointSym = new EsriSimpleMarkerSymbol(this.pointSymbol);

        this._drawTb = new Draw(this.map);

        this.coordinateFormat = new DijitTooltipDialog({
            content: new EditOutputCoordinate(),
            style: 'width: 400px'
        });

        this.own(dojoOn(this.clearGraphicsButton, 'click', this.clearGraphicsButtonClick));

        // set default values
        dojoDomAttr.set(this.observerOffset, 'value', '2');
        dojoDomAttr.set(this.surfaceOffset, 'value', '0');
        dojoDomAttr.set(this.distanceFrom, 'value', '0');
        dojoDomAttr.set(this.distanceTo, 'value', '1000');
        dojoDomAttr.set(this.horizontalDistanceFrom, 'value', '0');
        dojoDomAttr.set(this.horizontalDistanceTo, 'value', '360');
        dojoDomAttr.set(this.verticalDistanceFrom, 'value', '-90');
        dojoDomAttr.set(this.verticalDistanceTo, 'value', '90');

        this.syncEvents();
    },

    /**
    * Start up event listeners
    **/
    syncEvents: function () {
        
        dojoTopic.subscribe('VISIBILITY_WIDGET_OPEN', dojoLang.hitch(this, this.setGraphicsShown));
        dojoTopic.subscribe('VISIBILITY_WIDGET_CLOSE', dojoLang.hitch(this, this.setGraphicsHidden));

        this.own(dojoOn(
            this.observerPointBtn,
            'click',
            dojoLang.hitch(this, this.observerPointButtonWasClicked)
          ));

        this.own(dojoOn(
            this.clearGraphicsButton,
            'click',
            dojoLang.hitch(this, this.clearGraphics)
          ));

        this.own(dojoOn(
          this.coordinateFormatButton,
          'click',
          dojoLang.hitch(this, this.coordinateFormatButtonWasClicked)
        ));

        this.own(
          this._drawTb.on(
            'draw-end',
            dojoLang.hitch(this, this.addGraphic)
        ));

    },

    /**
    * Observer Point button click event
    **/
    observerPointButtonWasClicked: function () {
        this.map.disableMapNavigation();
        this._drawTb.activate('point');
        dojoDomClass.toggle(this.observerPointBtn, 'jimu-state-active');
    },

    /**
    * Add graphic to map
    **/
    addGraphic: function (evt) {
        //deactivate the toolbar and clear existing graphics 
        this._drawTb.deactivate();
        this.map.enableMapNavigation();

        // figure out which symbol to use
        var symbol;
        if (evt.geometry.type === "point" || evt.geometry.type === "multipoint") {
            symbol = this._pointSym;
        }

        this._rlosGL.add(new Graphic(evt.geometry, symbol));
    },

    /**
    * Clear graphics layer
    **/
    clearGraphics: function () {
        if (this._rlosGL) {
            this._rlosGL.clear();
            dojoDomAttr.set(this.observerPointCoords, 'value', '');
            dojoDomAttr.set(this.observerPointCoordsList, 'value', '');
        }
    },

      /**
           *
           **/
    setGraphicsHidden: function () {
        if (this._rlosGL) {
            this._rlosGL.hide();
        }
    },

      /**
       *
       **/
    setGraphicsShown: function () {
        if (this._rlosGL) {
            this._rlosGL.show();
        }
    }

  });
});
