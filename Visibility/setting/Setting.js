///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
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
  'jimu/BaseWidgetSetting',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/Color',
  'dojo/dom-geometry',
  'dijit/form/HorizontalSlider',
  'dijit/ColorPalette',
  'dijit/form/NumberSpinner',
  'jimu/dijit/ColorPicker'
],
  function(
    declare,
    BaseWidgetSetting,
    lang,
    array,
    _WidgetsInTemplateMixin,
    Color,
    domGeometry
    ) {

    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'visibility-setting',      

      postCreate: function(){
        this.setConfig(this.config);

        this.observerPointColorPicker.onChange = lang.hitch(this, function(val) {
          this.setColorText(this.observerPointColorPicker.domNode, val); 
        });
        this.targetPointColorPicker.onChange = lang.hitch(this, function(val) {
          this.setColorText(this.targetPointColorPicker.domNode, val); 
        });
      },

      setConfig: function(config){
        var controls = [{
            colorPicker: this.observerPointColorPicker,
            numberCtrl: this.observerPointSize,
            color: config.feedback.pointSymbol.color,
            width: config.feedback.pointSymbol.width
          }, {
            colorPicker: this.targetPointColorPicker,
            numberCtrl: this.targetPointSize,
            color: config.feedback.pointSymbol.outline.color,
            width: config.feedback.pointSymbol.outline.width
          }
        ];        
        array.forEach(controls, lang.hitch(this, function (control) {
          this.setColorPickerAttr(control.colorPicker, control.color);
          this.setNumberAttr(control.numberCtrl, control.width);
        }));
      },

      getConfig: function(){

        this.config.feedback = {
            "pointSymbol": {
                "type": "esriSMS",
                "style": "STYLE_CIRCLE",
                "color": [255, 50, 50, 255],
                "width": 100
            }         
        }     

        return this.config;
      },

      setColorPickerAttr: function(ctrl, color) {
        this.setColorText(ctrl.domNode, color);
        ctrl.setColor(new Color(color));
      },

      setNumberAttr: function(ctrl, val) {
        ctrl.set("value", val);
      },

      setColorText: function(domNode, color) {
        if (!(color instanceof Color)) {
          color = new Color(color);
        }
        var text = color.toHex();
        var textColor = (0.2126*color.r + 0.7152*color.g + 0.0722*color.b) > 128 ? new Color([0,0,0]) : new Color([255,255,255]);
        var height = domGeometry.position(domNode).h === 0 ? "36px" :  domGeometry.position(domNode).h + 'px';
        var style = 'width:100%;text-align:center;vertical-align:middle;line-height:' + height + ';color:' + textColor + ';';
        domNode.innerHTML = "<div style='" + style + "'>" + text +"</div>";
      }     
    });
  });