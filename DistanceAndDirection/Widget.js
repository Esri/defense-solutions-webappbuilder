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
  './TabLine',
  './TabCircle',
  './TabEllipse',
  './TabRange'
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
  TabLine,
  TabCircle,
  TabEllipse,
  TabRange
) {
  'use strict';
  var clz = dojoDeclare([jimuBaseWidget, dijitWidgetsInTemplate], {
    baseClass: 'jimu-widget-GeodesyAndRange',

    /**
     *
     **/
    postCreate: function () {

      this.lineTab = new TabLine({
        map: this.map,
        linesymbol: this.config.feedback.linesymbol || {
          type: 'esriSLS',
          style: 'esriSLSSolid',
          color: [255, 50, 50, 255],
          width: 1.25
        }},
        this.lineTabNode
      );

      this.circleTab = new TabCircle({
        map: this.map,
        circlesymbol: this.config.feedback.circlesymbol || {
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
        this.circleTabNode
      );

      /**
       *
       **/
      this.lineTab.on('graphic_created', function () {
        console.log('Widget notified that a graphic was created');
      });

      this.tab = new JimuTabContainer3({
        tabs: [
          {
            title: 'Lines',
            content: this.lineTab
          },
          {
            title: 'Circle',
            content: this.circleTab
          },
          {
            title: 'Ellipse',
            content: new TabEllipse({}, this.EllipseTabContainer)
          },
          {
            title: 'Range',
            content: new TabRange({}, this.RangeTabContainer)
          }
        ]
      }, this.tabContainer);

      this.own(dojoOn(this.clearGraphicsButton, 'click', function (){
        dojoTopic.publish('GR_CLEAR_GRAPHICS');
      }));
    },

    onClose: function () {
      dojoTopic.publish('GR_WIDGET_CLOSE');
    },

    onOpen: function () {
      dojoTopic.publish('GR_WIDGET_OPEN');
    }
  });
  return clz;
});
