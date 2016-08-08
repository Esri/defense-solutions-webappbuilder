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
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/sniff',
    'esri/tasks/GeometryService',
    'esri/request'
], function (
    dojoDeclare,
    dojoArray,
    dojoLang,
    dojoSniff,
    EsriGeometryService,
    EsriRequest
) {
    'use strict';
    return dojoDeclare(null, {

        constructor: function (ac) {
            this.appConfig = ac.appConfig;
            var gs = this.appConfig.geometryService;
            if (!gs) {
              gs = '//utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer';
            }
            this.geomService = new EsriGeometryService(gs);
        },

        /**
         *
         **/
        isNumber: function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        /**
         *
         **/
        getCleanInput: function (fromstr) {
            return fromstr.replace(/\s+/g, ' ').trim();
        },

        /**
         * Send request to get dd coordinates in format string
         **/
        getCoordValues: function (fromInput, toType, numDigits) {

            var nd = numDigits || 2;

            var tt;
            if (toType.name) {
              tt = toType.name;
            } else {
              tt = toType;
            }
            /**
             * for parameter info
             * http://resources.arcgis.com/en/help/arcgis-rest-api/#/To_GeoCoordinateString/02r30000026w000000/
             **/
            var params = {
                sr: 4326,
                coordinates: [[fromInput.x, fromInput.y]],
                conversionType: tt,
                numOfDigits: nd,
                rounding: true,
                addSpaces: false
            };

            if (toType === 'MGRS') {
                params.conversionMode = 'mgrsDefault';
                params.addSpaces = false;
                params.numOfDigits = 5;
            } else if (toType === 'UTM') {
                params.conversionMode = 'utmNorthSouth';
                params.addSpaces = true;
            } else if (toType === 'GARS') {
                params.conversionMode = 'garsDefault';
            } else if (toType === 'USNG') {
                params.addSpaces = true;
                params.numOfDigits = 5;
            }

            return this.geomService.toGeoCoordinateString(params);
        },

        getLat: function (fromNumber) {
          if (-89 > fromNumber < 91){
            return true;
          }
          return false;
        },

        /**
         *
         **/
        getXYNotation: function (fromStr, toType) {

            var a;
            var tt;
            if (toType.name) {
              tt = toType.name;
            } else {
              tt = toType;
            }

            var params = {
                sr: 4326,
                conversionType: tt,

                strings: []
            };

            switch (tt) {
            case 'DD':
            case 'DDM':
            case 'DMS':
                params.numOfDigits = 1;
                a = fromStr.replace(/['°"]/g, '');
                params.strings.push(a);
                break;
            case 'MGRS':
                params.conversionMode = 'mgrsNewStyle';
                params.strings.push(fromStr);
                break;
            case 'UTM':
                params.conversionMode = 'utmNorthSouth';
                a = fromStr.replace(/[mM]/g, '');
                params.strings.push(a);
                break;
            case 'GARS':
                params.conversionMode = 'garsCenter';
                params.strings.push(fromStr);
                break;
            }
            return this.geomService.fromGeoCoordinateString(params);
        },

        /**
         *
         **/
        getCoordinateType: function (fromInput) {

            var clnInput = this.getCleanInput(fromInput);
            //regexr.com
            var strs = [{
                    name: 'DD',
                    pattern: /([-+]?\d{1,3}[.]?\d*[NnSs]?[\s,]{1}[-+]?\d{1,3}[.]?\d*[EeWw]?){1}/
                }, {
                    name: 'DDM',
                    pattern: /^\s?\d{1,3}[°]?\s[-+]?\d*\.?\d*\'?[NnSs]?[\s,]{1}\d{1,3}[°]?\s[-+]?\d*\.?\d*\'[EeWw]?/
                }, {
                    name: 'DMS',
                    pattern: /([+-]?\d{1,3}[°]?[\s,]\d*[']?[\s,]\d*[.]?\d*['"]?[NnSsEeWw]?){1,2}/
                }, {
                    name: 'GARS',
                    pattern: /\d{3}[a-zA-Z]{2}\d?\d?/
                }, {
                    name: 'MGRS',
                    pattern: /^\d{1,2}[c-hj-np-xC-HJ-NP-X][-,;:\s]*[a-hj-np-zA-HJ-NP-Z]{1}[a-hj-np-zA-HJ-NP-Z]{1}[-,;:\s]*\d{0,10}/
                }, {
                    name: 'USNG',
                    pattern: /\d{2}[S,s,N,n]*\s[A-Za-z]*\s\d*/
                }, {
                    name: 'UTM',
                    pattern: /^\d{1,3}[NnSs]{1}([\s,-]\d*\.?\d*[mM]?){2}/
                }
            ];

            var matchedtype = dojoArray.filter(strs, function (itm) {
                return itm.pattern.test(this.v);
            }, {
              t:this,
              v:clnInput
            });

            if (matchedtype.length > 0) {
                return matchedtype;
            }

            return null;
        },

        /**
         *
         **/
        getFormattedDDStr: function (fromValue, withFormatStr, addSignPrefix) {
            var r = {};
            r.sourceValue = fromValue;
            r.sourceFormatString = withFormatStr;

            var parts = fromValue[0].split(/[ ,]+/);

            var latdeg = parts[0].replace(/[nNsS]/, '');
            r.yvalue = latdeg;

            var latdegdir = parts[0].slice(-1);
            r.ydir = latdegdir;
            if (addSignPrefix) {
                if (r.ydir === 'N') {
                    r.yvalue = '+' + latdeg;
                } else {
                    r.yvalue = '-' + latdeg;
                }
            }

            var londeg = parts[1].replace(/[eEwW]/, '');
            r.xvalue = londeg;

            var londegdir = parts[1].slice(-1);
            r.xdir = londegdir;
            if (addSignPrefix) {
                if (r.xdir === 'W') {
                    r.xvalue = '-' + londeg;
                } else {
                    r.xvalue = '+' + londeg;
                }
            }

            var s = withFormatStr.replace(/X/, r.xvalue);
            s = s.replace(/[eEwW]/, r.xdir);
            s = s.replace(/[nNsS]/, r.ydir);
            s = s.replace(/Y/, r.yvalue);

            r.formatResult = s;
            return r;
        },

        /**
         *
         **/
        getFormattedDDMStr: function (fromValue, withFormatStr, addSignPrefix) {

            var r = {};
            r.sourceValue = fromValue;
            r.sourceFormatString = withFormatStr;

            r.parts = fromValue[0].split(/[ ,]+/);

            r.latdeg = r.parts[0];
            r.latdegvalue = this.stripDecimalPlaces(parseFloat(r.latdeg, 1), 1);

            r.latmin = r.parts[1].replace(/[nNsS]/, '');
            r.yvalue = this.stripDecimalPlaces(parseFloat(r.latmin,1), 1);

            r.latdegdir = r.parts[1].slice(-1);
            r.ydir = r.latdegdir;
            if (addSignPrefix) {
                if (r.ydir === 'N') {
                    r.yvalue = '+' + r.yvalue;
                } else {
                    r.yvalue = '-' + r.yvalue;
                }
            }

            r.londeg = r.parts[2];
            r.londegvalue =  this.stripDecimalPlaces(parseFloat(r.londeg, 1), 1);

            r.lonmin = r.parts[3].replace(/[eEwW]/, '');
            r.xvalue =  this.stripDecimalPlaces(parseFloat(r.lonmin, 1), 1);

            r.londegdir = r.parts[3].slice(-1);
            r.xdir = r.londegdir;
            if (addSignPrefix) {
                if (r.xdir === 'W') {
                    r.xvalue = '-' + r.lonmin;
                } else {
                    r.xvalue = '+' + r.lonmin;
                }
            }

            //A° B'N X° Y'E
            var s = withFormatStr.replace(/A/, r.latdegvalue);
            s = s.replace(/[NnSs]/, r.ydir);
            s = s.replace(/[EeWw]/, r.xdir);
            s = s.replace(/X/, r.londegvalue);
            s = s.replace(/B/, r.yvalue);
            s = s.replace(/Y/, r.xvalue);

            r.formatResult = s;
            return r;

        },

        /**
         *
         **/
        getFormattedDMSStr: function (fromValue, withFormatStr, addSignPrefix) {
            var r = {};
            r.sourceValue = fromValue;
            r.sourceFormatString = withFormatStr;

            var parts = fromValue[0].split(/[ ,]+/);

            r.latdeg =  this.stripDecimalPlaces(parseFloat(parts[0]).toFixed(1), 1);
            r.latmin =  this.stripDecimalPlaces(parseFloat(parts[1]).toFixed(1), 1);
            r.latsec =  this.stripDecimalPlaces(parseFloat(parts[2].replace(/[NnSs]/, '')).toFixed(1), 1);

            var latdegdir = parts[2].slice(-1);
            r.ydir = latdegdir;

            r.londeg = this.stripDecimalPlaces(parseFloat(parts[3]).toFixed(1), 1);
            r.lonmin = this.stripDecimalPlaces(parseFloat(parts[4]).toFixed(1), 1);
            r.lonsec = this.stripDecimalPlaces(parseFloat(parts[5].replace(/[EWew]/, '')).toFixed(1), 1);

            var londegdir = parts[5].slice(-1);
            r.xdir = londegdir;

            //A° B' C''N X° Y' Z''E
            var s = withFormatStr.replace(/A/, r.latdeg);
            s = s.replace(/B/, r.latmin);
            s = s.replace(/C/, r.latsec);
            s = s.replace(/X/, r.londeg);
            s = s.replace(/Y/, r.lonmin);
            s = s.replace(/Z/, r.lonsec);
            s = s.replace(/[NnSs]/, r.ydir);
            s = s.replace(/[EeWw]/, r.xdir);

            r.formatResult = s;
            return r;

        },

        /*
         *
         */
        stripDecimalPlaces: function (num, dplaces) {
          var v = '';
          var tString = num.toString();
          var tStrings = tString.split('.');
          if (tStrings.length === 2) {
            if (tStrings[1] === '0') {
              v += tStrings[0];
              return v;
            }
          }
          return tString;
        },

        /**
         *
         **/
        getFormattedUSNGStr: function (fromValue, withFormatStr, addSignPrefix) {
            var r = {};
            r.sourceValue = fromValue;
            r.sourceFormatString = withFormatStr;

            r.gzd = fromValue[0].match(/\d{1,2}[C-HJ-NP-X]/)[0].trim();
            r.grdsq = fromValue[0].match(/\s[a-zA-Z]{2}/)[0].trim();
            r.easting = fromValue[0].match(/\s\d*\s/)[0].trim();
            r.northing = fromValue[0].match(/\d{5}$/)[0].trim();

            //Z S X# Y#
            var s = withFormatStr.replace(/Z/, r.gzd);
            s = s.replace(/S/, r.grdsq);
            s = s.replace(/X/, r.easting);
            s = s.replace(/Y/, r.northing);

            r.formatResult = s;
            return r;
        },

        /**
         *
         **/
        getFormattedMGRSStr: function (fromValue, withFormatStr, addSignPrefix) {
            var r = {};
            r.sourceValue = fromValue;
            r.sourceFormatString = withFormatStr;

            r.gzd = fromValue[0].match(/\d{1,2}[C-HJ-NP-X]/)[0].trim();
            r.grdsq = fromValue[0].replace(r.gzd, '').match(/[a-hJ-zA-HJ-Z]{2}/)[0].trim();
            r.easting = fromValue[0].replace(r.gzd + r.grdsq, '').match(/^\d{1,5}/)[0].trim();
            r.northing = fromValue[0].replace(r.gzd + r.grdsq, '').match(/\d{1,5}$/)[0].trim();

            //Z S X# Y#
            var s = withFormatStr.replace(/Z/, r.gzd);
            s = s.replace(/S([^S]*)$/, r.grdsq+'$1');
            s = s.replace(/X/, r.easting);
            s = s.replace(/Y/, r.northing);

            r.formatResult = s;
            return r;
        },

        /**
         *
         **/
        getFormattedGARSStr: function (fromValue, withFormatStr, addSignPrefix) {
          var r = {};
          r.sourceValue = fromValue;
          r.sourceFormatString = withFormatStr;

          r.lon = fromValue[0].match(/\d{3}/);
          r.lat = fromValue[0].match(/[a-zA-Z]{2}/);

          var q = fromValue[0].match(/\d*$/);
          r.quadrant = q[0][0];
          r.key = q[0][1];

          //XYQK
          var s = withFormatStr.replace(/X/, r.lon);
          s = s.replace(/Y/, r.lat);
          s = s.replace(/Q/, r.quadrant);
          s = s.replace(/K/, r.key);

          r.formatResult = s;
          return r;
        },

        /**
         *
         **/
        getFormattedUTMStr: function (fromValue, withFormatStr, addSignPrefix, addDirSuffix) {
            var r = {};
            r.sourceValue = fromValue;
            r.sourceFormatString = withFormatStr;

            r.parts = fromValue[0].split(/[ ,]+/);
            r.zone = r.parts[0].replace(/[NSEW]/,'');
            r.hemisphere = r.parts[0].slice(-1);
            r.easting = r.parts[1];
            r.westing = r.parts[2];

            //ZH Xm Ym'
            var s = withFormatStr.replace(/Z/, r.zone);
            s = s.replace(/H/, r.hemisphere);
            s = s.replace(/X/, r.easting);
            s = s.replace(/Y/, r.westing);

            r.formatResult = s;
            return r;
        }
    });
});
