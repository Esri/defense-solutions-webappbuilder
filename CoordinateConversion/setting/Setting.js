///////////////////////////////////////////////////////////////////////////
// Copyright © 2016 Esri. All Rights Reserved.
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
//
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/dom-attr',
  'jimu/BaseWidgetSetting',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/MultiSelect',
  'jimu/dijit/ServiceURLInput'
], function (
  dojoDeclare,
  dojoArray,
  dojoDomAttr,
  jimuBaseSettingWidget,
  dijitWidgetsInTemplate
) {
  return dojoDeclare([jimuBaseSettingWidget, dijitWidgetsInTemplate], {
    baseClass: 'jimu-widget-coordinateconversion-setting',

    /**
     * settings startup event handler
     **/
    startup: function () {
      this.inherited(arguments);

      //this.geoservice.set('value', this.config.coordinateconversion.geometryService.url);
      this.notationSelect.set('value', this.config.coordinateconversion.initialCoords);
      this.scale.set('value', this.config.coordinateconversion.zoomScale);
      this.setConfig(this.config);
    },

    /**
     *
     **/
    setConfig: function (cfg) {
      this.config = cfg;
    },

    /**
     *
     **/
    getConfig: function () {
      //this.config.coordinateconversion.geometryService.url = this.geoservice.get('value');
      this.config.coordinateconversion.initialCoords= this.notationSelect.get('value');
      this.config.coordinateconversion.zoomScale = parseFloat(this.scale.value);
      return this.config;
    }
  });
});
