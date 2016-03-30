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

/*global define*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/_base/array',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/registry',
    'jimu/BaseWidget',
    'esri/layers/GraphicsLayer',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/PictureMarkerSymbol',
    './CoordinateControl'
], function (
    dojoDeclare,
    dojoLang,
    dojoTopic,
    dojoArray,
    dijitWidgetsInTemplateMixin,
    dijitRegistry,
    jimuBaseWidget,
    EsriGraphicsLayer,
    EsriSimpleRenderer,
    EsriPictureMarkerSymbol,
    CoordinateControl
) {
    'use strict';
    var cls = dojoDeclare([jimuBaseWidget, dijitWidgetsInTemplateMixin], {
        baseClass: 'jimu-widget-cw',
        name: 'CW',

        /**
         *
         **/
        postCreate: function () {
            dojoTopic.subscribe(
              'REMOVECONTROL',
              dojoLang.hitch(this, this.removeControl)
            );

            dojoTopic.subscribe(
              'ADDNEWNOTATION',
              dojoLang.hitch(this, this.addOutputSrBtn)
            );

            this.coordTypes = [
              'DD',
              'DDM',
              'DMS',
              'GARS',
              'MGRS',
              'USNG',
              'UTM'
            ];

            if (this.config.initialCoords && this.config.initialCoords.length > 0) {
                this.coordTypes = this.config.initialCoords;
            }

            // Create graphics layer
            if (!this.coordGLayer) {
                var glsym = new EsriPictureMarkerSymbol(
                    this.folderUrl + 'images/CoordinateLocation.png',
                    26,
                    26
                );
                glsym.setOffset(0, 13);

                var glrenderer = new EsriSimpleRenderer(glsym);

                this.coordGLayer = new EsriGraphicsLayer();
                this.coordGLayer.setRenderer(glrenderer);
                this.map.addLayer(this.coordGLayer);
            }
        },

        /**
         *
         **/
        removeControl: function (r) {
          r.destroyRecursive();
        },

        /**
         *
         **/
        addOutputSrBtn: function (withType) {
            if (!withType) {
                withType = 'DD';
            }

            var cc = new CoordinateControl({
                parentWidget: this,
                input: false,
                currentClickPoint: this.inputControl.currentClickPoint,
                type: withType
            });

            cc.placeAt(this.outputtablecontainer);
            cc.startup();
        },

        /**
         *
         **/
        startup: function () {
            this.inputControl = new CoordinateControl({
                parentWidget: this,
                input: true,
                type: 'DD'
            });
            this.inputControl.placeAt(this.inputcoordcontainer);
            this.inputControl.startup();

            // add default output coordinates
            dojoArray.forEach(this.coordTypes, function (itm) {
                this.addOutputSrBtn(itm);
            }, this);
        },

        /**
         * widget open event handler
         **/
        onOpen: function () {
            this.setWidgetSleep(false);
        },

        /**
         * widget close event handler
         **/
        onClose: function () {
            this.setWidgetSleep(true);
        },

        /**
         *
         **/
        setWidgetSleep: function (sleeping) {

            if (sleeping) {
                if (this.coordGLayer && this.coordGLayer.visible) {
                    this.coordGLayer.setVisibility(false);
                }
            } else {
                if (this.coordGLayer && !this.coordGLayer.visible) {
                    this.coordGLayer.setVisibility(true);
                }
            }

            //inform the children we are inactive
            dojoTopic.publish('CRDWIDGETSTATEDIDCHANGE', this.state);
        },

        /**
         *
         **/
        disableWebMapPopup: function () {
            this.map.setInfoWindowOnClick(false);
        },

        /**
         *
         **/
        enableWebMapPopup: function () {
            this.map.setInfoWindowOnClick(true);
        }
    });

    return cls;
});
