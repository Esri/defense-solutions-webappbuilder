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
  'dojo/string',
  'dojo/number',
  'esri/geometry/geometryEngine',
  'esri/geometry/webMercatorUtils',
  'esri/geometry/Point',
  'esri/geometry/Polyline'
], function (
  dojoDeclare,
  dojoString,
  dojoNumber,
  esriGeometryEngine,
  esriWMUtils,
  esriPoint,
  esriPolyline
) {
  return dojoDeclare(null, {

    Units: [
      'meters',
      'feet',
      'kilometers',
      'miles',
      'nautical-miles',
      'yards'
    ],

    /**
     *
     **/
    getAngle: function (inUnits) {
      var delx = this.endPoint.y - this.startPoint.y;
      var dely = this.endPoint.x - this.startPoint.x;

      var azi = Math.atan2(dely, delx) * 180 / Math.PI;
      var br = ((azi + 360) % 360);

      if (inUnits === 'mils') {
        br = br * 17.777777778;
      }

      return br.toFixed(2);
    },

    /**
     * Returns Geodesic Length of the Geometry
     **/
    getLength: function (withUnit) {

      var u = this.Units[0];
      if (this.Units.indexOf(withUnit.toLowerCase()) > -1){
        u = withUnit.toLowerCase();
      }

      return esriGeometryEngine.geodesicLength(
        this.geographicGeometry,
        u
      );
    },

    /**
     *
     **/
    getFormattedLength: function (withUnit) {
      return dojoNumber.format(this.getLength(withUnit), {
        places:4
      });
    },

    /**
     *
     * @param length
     * @returns {*}
     */
    formatLength: function (length) {
      return dojoNumber.format(length, {
        places: 4
      })
    },

    /**
     *
     **/
    constructor: function (args) {
      dojoDeclare.safeMixin(this, args);

      if (this.geometry.type === "polygon") {
        var pLine = new esriPolyline({
          paths: [
            [this.geometry.paths[0][0], this.geometry.paths[0][1]]
          ],
          spatialReference: {
            wkid: this.geometry.spatialReference.wkid
          }
        });
        pLine = esriWMUtils.webMercatorToGeographic(pLine);
        this.geographicGeometry = pLine;
        this.geodesicGeometry = esriGeometryEngine.geodesicDensify(pLine, 10000);
        this.wmGeometry = this.geometry;
      }
      else {
        this.geodesicGeometry = esriGeometryEngine.geodesicDensify(this.geographicGeometry, 10000);
        this.wmGeometry = esriWMUtils.geographicToWebMercator(this.geodesicGeometry);
      }
      this.startPoint = this.geodesicGeometry.getPoint(0,0);
      this.endPoint = this.geodesicGeometry.getPoint(0, this.geodesicGeometry.paths[0].length - 1);

      this.formattedStartPoint = dojoString.substitute('${xStr}, ${yStr}', {
        xStr: dojoNumber.format(this.startPoint.y, {places:4}),
        yStr: dojoNumber.format(this.startPoint.x, {places:4})
      });

      this.formattedEndPoint = dojoString.substitute('${xStr}, ${yStr}', {
        xStr: dojoNumber.format(this.endPoint.y, {places:4}),
        yStr: dojoNumber.format(this.endPoint.x, {places:4})
      });

      //this.formattedLength =

      //this.degreeangle = dojoNumber.format(this.getAngle(), {places:2});
    }
  });
});
