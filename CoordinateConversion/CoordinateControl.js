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
    'dojo/on',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/string',
    'dojo/topic',
    'dojo/keys',
    'dojo/dom',
    'dojo/query',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/TextBox',
    'dijit/form/Textarea',
    'dijit/form/Select',
    'dijit/InlineEditBox',
    'dijit/registry',
    'dijit/Tooltip',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dojo/text!./CoordinateControl.html',
    'esri/geometry/webMercatorUtils',
    'esri/graphic',
    'esri/geometry/Point',
    'esri/SpatialReference',
    'esri/tasks/GeometryService',
    './util',
    'jimu/dijit/Message',
    './EditOutputCoordinate'
], function (
    dojoDeclare,
    dojoLang,
    dojoOn,
    dojoDomAttr,
    dojoDomClass,
    dojoDomStyle,
    dojoString,
    dojoTopic,
    dojoKeys,
    dojoDom,
    dojoQuery,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    dijitTextBox,
    dijitTextArea,
    dijitSelect,
    dijitInlineEditBox,
    dijitRegistry,
    dijitTooltip,
    DijitTooltipDialog,
    dijitPopup,
    coordCntrl,
    esriWMUtils,
    EsriGraphic,
    EsriPoint,
    EsriSpatialReference,
    EsriGeometryService,
    Util,
    JimuMessage,
    CoordFormat
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: coordCntrl,
        baseClass: 'jimu-widget-cc',
        input: true,
        inputFromText: false,
        hasCustomLabel: false,
        /**** type: 'dd', Available Types: DD, DDM, DMS, GARS, MGRS, USNG, UTM ****/

        /**
         *
         **/
        constructor: function (args) {
            dojoDeclare.safeMixin(this, args);
            this.uid = args.id || dijitRegistry.getUniqueId('cc');
        },

        /**
         *
         **/
        parentStateDidChange: function (state) {
            if (state === 'opened') {
                this.mapclickhandler.resume();
            } else {
                this.mapclickhandler.pause();
            }
        },

        /**
         *
         **/
        postCreate: function () {

          // set initial value of coordinate type dropdown
          //this.typeSelect.set('value', this.type);

          this._frmtdlg = new DijitTooltipDialog({
              id: this.uid + '_formatCoordinateTooltip',
              content: new CoordFormat(),
              style: 'width: 400px',
              onClose: dojoLang.hitch(this, this.popupDidClose)
          });

          this.setConfig();

          this.initUI();

          // set an initial coord
          if (this.currentClickPoint) {
            this.updateDisplay();
          }
        },

        /**
         *
         **/
        setConfig: function () {
          this.util = new Util({
            appConfig: this.parentWidget.config
          });

          var geomsrvcurl = this.parentWidget.config.geometryService.url ||
            'http://pscltags1.eastus.cloudapp.azure.com/arcgis/rest/services/Utilities/Geometry/GeometryServer';

          this.geomsrvc = new EsriGeometryService(geomsrvcurl);

          this.zoomScale = this.parentWidget.config.zoomLevel || 10;

        },

        /**
         *
         **/
        initUI: function () {
          // hide any actions we don't want to see on the input coords
          if (this.input) {
            this.setHidden(this.expandButton);
            this.setHidden(this.removeControlBtn);
            this.setHidden(this.coordNameContainer);

            dojoDomClass.add(this.cpbtn, 'inputCopyBtn');
            dojoDomAttr.set(this.cpbtn, 'title', 'Copy All');

            // add a default graphic during input widget initialization
            var cPt = this.parentWidget.map.extent.getCenter();
            this.parentWidget.coordGLayer.add(new EsriGraphic(cPt));
            this.currentClickPoint = this.getDDPoint(cPt);
          } else {
            dojoDomClass.add(this.cpbtn, 'outputCopyBtn');
            this.setHidden(this.addNewCoordinateNotationBtn);
            this.setHidden(this.zoomButton);
            this.coordtext.readOnly = true;
          }
          this.setUIListeners();
        },

        /**
         *
         **/
        setUIListeners: function () {
          // setup event notification and handlers
          dojoTopic.subscribe(
            'CRDWIDGETSTATEDIDCHANGE',
            dojoLang.hitch(this, this.parentStateDidChange)
          );

          dojoTopic.subscribe(
            'INPUTPOINTDIDCHANGE',
            dojoLang.hitch(this, this.mapWasClicked)
          );

          // listen for dijit events
          this.own(dojoOn(
            this.expandButton,
            'click',
            dojoLang.hitch(this, this.expandButtonWasClicked)
          ));

          this.own(dojoOn(
            this.addNewCoordinateNotationBtn,
            'click',
            dojoLang.hitch(this, this.newCoordnateBtnWasClicked
          )));

          this.own(dojoOn(
            this.zoomButton,
            'click',
            dojoLang.hitch(this, this.zoomButtonWasClicked)
          ));

          this.own(
            this.coordName.on(
              'change',
              dojoLang.hitch(this, this.coordNameDidChange))
          );

          this.cpbtn.addEventListener(
            'click',
            dojoLang.hitch(this, this.cpBtnWasClicked)
          );

          this.subVal1CpBtn.addEventListener(
            'click',
            dojoLang.hitch(this, this.cpSubBtnWasClicked)
          );

          this.subVal2CpBtn.addEventListener(
            'click',
            dojoLang.hitch(this, this.cpSubBtnWasClicked)
          );

          this.subVal3CpBtn.addEventListener(
            'click',
            dojoLang.hitch(this, this.cpSubBtnWasClicked)
          );

          this.subVal3CpBtn.addEventListener(
            'click',
            dojoLang.hitch(this, this.cpSubBtnWasClicked)
          );

          this.mapclickhandler = dojoOn.pausable(
            this.parentWidget.map,
            'click',
            dojoLang.hitch(this, this.mapWasClicked)
          );

          this.own(dojoOn(
            this.formatButton,
            'click',
            dojoLang.hitch(this, this.formatButtonWasClicked)
          ));

          this.own(dojoOn(this._frmtdlg.content.applyButton, 'click',
            dojoLang.hitch(this, function (d) {
                  this.updateDisplay();
                  if (!this.hasCustomLabel && !this._frmtdlg.content.formats[this._frmtdlg.content.ct].useCustom) {
                    this.coordName.set('value', this._frmtdlg.content.ct);
                  }
                  dijitPopup.close(this._frmtdlg);
            }))
          );

          this.own(dojoOn(this._frmtdlg.content.cancelButton, 'click',
            dojoLang.hitch(this, function (d) {
                  dijitPopup.close(this._frmtdlg);
            }))
          );

          this.own(dojoOn(
            this.coordtext,
            'keyup',
            dojoLang.hitch(this, this.coordTextInputKeyWasPressed)
          ));

          this.own(this.geomsrvc.on('error', dojoLang.hitch(
            this,
            this.geomSrvcDidFail)
          ));
        },

        /**
         *
         **/
        popupDidClose: function (evt) {
          var fv = this._frmtdlg.content.frmtSelect.get('value');
          if (this.type !== fv) {
            this.type = fv;
            this.updateDisplay();
          }
        },

        /**
         *
         **/
        coordNameDidChange: function (evt) {
          this.hasCustomLabel = true;
        },

        /**
         *
         **/
        cpSubBtnWasClicked: function (evt) {
            var c = evt.currentTarget.id.split('~')[0];
            var s;

            this[c].select();
            try {
                s = document.execCommand('copy');
            } catch (err) {
                s = false;
            }

            var t = s ? 'Copy Succesful' : 'Unable to Copy\n use ctrl+c as an alternative';

            this.showToolTip(evt.currentTarget.id, t);
        },

        /**
         *
         **/
        cpBtnWasClicked: function (evt) {
            evt.preventDefault();
            var s = undefined;
            var t;
            var tv;
            var fw;
            var w;

            if (this.input) {

                fw = dijitRegistry.toArray().filter(function (w) {
                    return w.baseClass === 'jimu-widget-cc' && !w.input;
                });

                w = fw.map(function (w) {
                    return w.coordtext.value;
                }).join('\r\n');

                tv = this.coordtext.value;

                this.coordtext.value = w;

                this.coordtext.select();

                try {
                    s = document.execCommand('copy');

                } catch (caerr) {
                    s = false;
                }

                this.coordtext.value = tv;
            } else {

                this.coordtext.select();
                try {
                    s = document.execCommand('copy');
                } catch (cerr) {
                    s = false;
                }
            }

            t = s ? 'Copy Succesful' : 'Unable to Copy\n use ctrl+c as an alternative';

            this.showToolTip(this.cpbtn.id, t);
        },

        /**
         *
         **/
        cpCoordPart: function (fromCntrl) {
        },

        /**
         *
         **/
        showToolTip: function (onId, withText) {

            var n = dojoDom.byId(onId);
            dijitTooltip.show(withText, n);
            /*dijitTooltip.defaultPosition = 'below';
            dojoOn.once(n, dojoMouse.leave, function () {
                dijitTooltip.hide(n);
            })*/
            setTimeout(function () {
                dijitTooltip.hide(n);
            }, 1000);
        },

        /**
         *
         **/
        geomSrvcDidComplete: function (r) {
            if (r[0].length <= 0) {
                new JimuMessage({message: 'unable to parse coordinates'});
                return;
            }

            var newpt = new EsriPoint(r[0][0], r[0][1], new EsriSpatialReference({wkid: 4326}));
            this.currentClickPoint = newpt;

            if (this.input) {
                //this.zoomButtonWasClicked();
                this.parentWidget.map.centerAt(this.currentClickPoint);
                dojoTopic.publish('INPUTPOINTDIDCHANGE', {
                  mapPoint: this.currentClickPoint,
                  inputFromText: true});
            }
        },

        /**
         *
         **/
        geomSrvcDidFail: function () {
          new JimuMessage({message: 'Unable to parse input coordinates'});
        },

        /**
         *
         *
        coordTextInputLostFocus: function (evt) {
        },*/

        /**
         * Handles enter key press event
         **/
        coordTextInputKeyWasPressed: function (evt) {
            if (evt.keyCode === dojoKeys.ENTER) {
                var sanitizedInput = this.util.getCleanInput(evt.currentTarget.value);
                var newType = this.util.getCoordinateType(sanitizedInput);
                if (newType) {
                    //this.type = newType[newType.length-1].name;
                    this.processCoordTextInput(sanitizedInput, newType[newType.length-1].name);
                } else {
                    new JimuMessage({message: 'Unable to determine input coordinate type'});
                }
                dojoDomAttr.set(this.coordtext, 'value', sanitizedInput);
            }
        },

        /**
         *
         **/
        processCoordTextInput: function (withStr, asType) {
            this.util.getXYNotation(withStr, asType).then(
                dojoLang.hitch(this, this.geomSrvcDidComplete),
                dojoLang.hitch(this, this.geomSrvcDidFail)
            );
        },

        /**
         *
         **/
        zoomButtonWasClicked: function () {
            if (this.input) {
              if (this.parentWidget.map.getZoom() < this.zoomScale) {
                this.parentWidget.map.centerAndZoom(this.currentClickPoint, this.zoomScale);
              } else {
                this.parentWidget.map.centerAt(this.currentClickPoint);
              }

            }
        },

        /**
         *
         **/
        typeSelectDidChange: function () {
            //this.type = this.typeSelect.get('value');

            if (this.currentClickPoint) {
                this.updateDisplay();
            }
        },

        /**
         *
         **/
        newCoordnateBtnWasClicked: function () {
            dojoTopic.publish('ADDNEWNOTATION', this.type);
        },

        /**
         *
         **/
        setHidden: function (cntrl) {
            dojoDomStyle.set(cntrl, 'display', 'none');
        },

        /**
         *
         **/
        setVisible: function (cntrl) {
            dojoDomStyle.set(cntrl, 'display', 'inline-flex');
        },

        /**
         *
         **/
        remove: function () {
            dojoTopic.publish('REMOVECONTROL', this);
        },

        /**
         *
         **/
        mapWasClicked: function (evt) {
            this.currentClickPoint = this.getDDPoint(evt.mapPoint);
            if (evt.inputFromText) {
                this.inputFromText = true;
            } else {
                this.inputFromText = false;
            }
            this.updateDisplay();
        },

        /**
         *
         **/
        getDDPoint: function (fromPoint) {
            if (fromPoint.spatialReference.wkid === 102100) {
                return esriWMUtils.webMercatorToGeographic(fromPoint);
            }
            return fromPoint;
        },

        /**
         *
         **/
        expandButtonWasClicked: function () {
            dojoDomClass.toggle(this.coordcontrols, 'expanded');

            // if this.coordcontrols is expanded then disable all it's children
            this.setSubCoordUI(dojoDomClass.contains(this.coordcontrols, 'expanded'));
        },

        /**
         *
         **/
        formatButtonWasClicked: function () {
            this._frmtdlg.content.set('ct', this.type);

            dijitPopup.open({
                popup: this._frmtdlg,
                around: this.formatButton
            });

        },

        /**
         *
         **/
        setSubCoordUI: function (expanded) {

            if (expanded) {
                var cntrHeight = '150px';
                switch (this.type) {
                case 'DD':
                case 'DMS':
                case 'DDM':
                    this.sub1label.innerHTML = 'Lat';
                    this.sub2label.innerHTML = 'Lon';
                    this.setHidden(this.sub3);
                    this.setHidden(this.sub4);
                    cntrHeight = '90px';
                    break;
                case 'GARS':
                    this.sub1label.innerHTML = 'Lon';
                    this.sub2label.innerHTML = 'Lat';
                    this.sub3label.innerHTML = 'Quadrant';
                    this.setVisible(this.sub3);
                    this.sub4label.innerHTML = 'Key';
                    this.setVisible(this.sub4);
                    break;
                case 'USNG':
                case 'MGRS':
                    this.sub1label.innerHTML = 'GZD';
                    this.sub2label.innerHTML = 'Grid Sq';
                    this.sub3label.innerHTML = 'Easting';
                    this.setVisible(this.sub3);
                    this.sub4label.innerHTML = 'Northing';
                    this.setVisible(this.sub4);
                    break;
                case 'UTM':
                    this.sub1label.innerHTML = 'Zone';
                    this.sub2label.innerHTML = 'Easting';
                    this.sub3label.innerHTML = 'Northing';
                    this.setVisible(this.sub3);
                    this.setHidden(this.sub4);
                    cntrHeight = '125px';
                    break;
                }
                dojoDomStyle.set(this.coordcontrols, 'height', cntrHeight);
            } else {
                dojoDomStyle.set(this.coordcontrols, 'height', '0px');
            }
        },

        /**
         *
         **/
        setCoordUI: function (withValue) {
            var formattedStr;
            var cntrlid = this.uid.split('_')[1];

            // make sure we haven't been removed
            if (!this['cc_' + cntrlid + 'sub1val']){
                return;
            }

            if (this.input && this.inputFromText){
              return;
            } else {
                var format;

                var f = this._frmtdlg.content.formats[this.type];
                var as = this._frmtdlg.content.addSignChkBox.checked;
                var r;

                if (f.useCustom) {
                    format = f.customFormat;
                } else {
                    format = f.defaultFormat;
                }

                switch (this.type) {
                case 'DD':

                    r = this.util.getFormattedDDStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = dojoString.substitute('${xcrd}', {
                        xcrd: r.xvalue
                    });

                    this['cc_' + cntrlid + 'sub2val'].value = dojoString.substitute('${ycrd}', {
                        ycrd: r.yvalue
                    });

                    formattedStr = r.formatResult;
                    break;
                case 'DDM':

                    r = this.util.getFormattedDDMStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = dojoString.substitute('${latd} ${latm}', {
                        latd: r.latdegvalue,
                        latm: r.yvalue
                    });

                    this['cc_' + cntrlid + 'sub2val'].value = dojoString.substitute('${lond} ${lonm}', {
                        lond: r.londegvalue,
                        lonm: r.xvalue
                    });

                    formattedStr = r.formatResult;
                    break;
                case 'DMS':

                    r = this.util.getFormattedDMSStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = dojoString.substitute('${latd} ${latm} ${lats}', {
                        latd: r.latdeg,
                        latm: r.latmin,
                        lats: r.latsec
                    });

                    this['cc_' + cntrlid + 'sub2val'].value = dojoString.substitute('${lond} ${lonm} ${lons}', {
                        lond: r.londeg,
                        lonm: r.lonmin,
                        lons: r.lonsec
                    });

                    formattedStr = r.formatResult;
                    break;
                case 'USNG':

                    r = this.util.getFormattedUSNGStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = r.gzd;
                    this['cc_' + cntrlid + 'sub2val'].value = r.grdsq;
                    this['cc_' + cntrlid + 'sub3val'].value = r.easting;
                    this['cc_' + cntrlid + 'sub4val'].value = r.northing;

                    formattedStr = r.formatResult;

                    break;
                case 'MGRS':
                    r = this.util.getFormattedMGRSStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = r.gzd;
                    this['cc_' + cntrlid + 'sub2val'].value = r.grdsq;
                    this['cc_' + cntrlid + 'sub3val'].value = r.easting;
                    this['cc_' + cntrlid + 'sub4val'].value = r.northing;

                    formattedStr = r.formatResult;
                    break;
                case 'GARS':
                    r = this.util.getFormattedGARSStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = r.lon;
                    this['cc_' + cntrlid + 'sub2val'].value = r.lat;
                    this['cc_' + cntrlid + 'sub3val'].value = r.quadrant;
                    this['cc_' + cntrlid + 'sub4val'].value = r.key;

                    formattedStr = r.formatResult;
                    break;
                case 'UTM':
                    r = this.util.getFormattedUTMStr(withValue, format, as);

                    this['cc_' + cntrlid + 'sub1val'].value = r.zone + r.hemisphere;
                    this['cc_' + cntrlid + 'sub2val'].value = r.easting;
                    this['cc_' + cntrlid + 'sub3val'].value = r.westing;

                    formattedStr = r.formatResult;
                    break;
                }
                this.setSubCoordUI(dojoDomClass.contains(this.coordcontrols, 'expanded'));
                if (this.coordtext) {
                    dojoDomAttr.set(this.coordtext, 'value', formattedStr);
                }
            }
        },

        /**
         *
         **/
        getFormattedCoordinates: function () {
            this.util.getCoordValues(this.currentClickPoint, this.type).then(
                dojoLang.hitch({s: this}, function (r) {
                    this.s.setCoordUI(r);
                }),
                dojoLang.hitch(this, function (err) {
                    console.log(err);
                })
            );
        },

        /**
         *
         **/
        updateDisplay: function () {
            this.getFormattedCoordinates(this.currentClickPoint);

            if (this.input) {
                this.parentWidget.coordGLayer.clear();
                this.parentWidget.coordGLayer.add(new EsriGraphic(this.currentClickPoint));
            }
        }
    });
});
