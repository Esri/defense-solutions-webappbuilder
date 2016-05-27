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

      this.syncEvents();
    },

    /**
     * Start up event listeners
     **/
    syncEvents: function () {

    }

  });
});
