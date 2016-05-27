///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015 Esri. All Rights Reserved.
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

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/topic',
  'dojo/_base/array',
  'dojo/on',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',
  'jimu/BaseWidget',
  'jimu/dijit/TabContainer3',
  'jimu/dijit/ViewStack',
  './TabLLOS',
  './TabRLOS'
], function (
  dojoDeclare,
  dojoLang,
  dojoTopic,
  dojoArray,
  dojoOn,
  dijitWidgetsInTemplate,
  dijitRegistry,
  jimuBaseWidget,
  JimuTabContainer3,
  JimuViewStack,
  TabLLOS,
  TabRLOS
) {
  'use strict';
  var clz = dojoDeclare([jimuBaseWidget, dijitWidgetsInTemplate], {
    baseClass: 'jimu-widget-Visibility',

    /**
     *
     **/
    postCreate: function () {

      this.llosTab = new TabLLOS({
          map: this.map,
          pointSymbol: this.config.feedback.pointSymbol || {
              "type": "esriSMS",
              "style": "STYLE_CIRCLE",
              "color": [255, 50, 50, 255],
              "width": 100
          }},
        this.llosTabNode
      );

      this.rlosTab = new TabRLOS({
        map: this.map,
        appConfig: this.appConfig,
        circleSymbol: this.config.feedback.circleSymbol || {
          type: 'esriSFS',
          style: 'esriSFSNull',
          color: [255,0,0,0],
          outline: {
            color: [255, 50, 50, 255],
            width: 1.25,
            type: 'esriSLS',
            style: 'esriSLSSolid'
          }
        }},
        this.rlosTabNode
      );

      /**
       *
       **/
      this.llosTab.on('graphic_created', function () {
        console.log('Widget notified that a graphic was created');
      });

      this.tab = new JimuTabContainer3({
        tabs: [
          {
            title: 'LLOS',
            content: this.llosTab
          },
          {
            title: 'RLOS',
            content: this.rlosTab
          }
        ]
      }, this.tabContainer);

      this.own(dojoOn(this.clearGraphicsButton, 'click', function (){
        dojoTopic.publish('VISIBILITY_CLEAR_GRAPHICS');
      }));
    },

    onClose: function () {
        dojoTopic.publish('VISIBILITY_WIDGET_CLOSE');
    },

    onOpen: function () {
        dojoTopic.publish('VISIBILITY_WIDGET_OPEN');
    }
  });
  return clz;
});
