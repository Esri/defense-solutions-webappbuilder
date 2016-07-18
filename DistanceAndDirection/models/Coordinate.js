define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Stateful',
  'dojo/topic',
  'dojo/Deferred',
  'esri/geometry/Point',
  'esri/SpatialReference',
  'esri/geometry/webMercatorUtils',
  '../util'
], function (
  dojoDeclare,
  dojoLang,
  dojoStateful,
  dojoTopic,
  DojoDeferred,
  EsriPoint,
  EsriSpatialReference,
  EsriWMUtils,
  CoordinateUtilities
) {

  var mo = dojoDeclare([dojoStateful], {

    formatPrefix: false,
    _formatPrefixSetter: function (value) {
      this.formatPrefix = value;
    },

    inputString: null,
    _inputStringSetter: function (value) {
      this.inputString = value;
    },

    formatString: 'YN XE',
    _formatStringSetter: function (value) {
      this.formatString = value;
      //this.getFormattedValue();
    },

    inputType: 'UNKNOWN',

    formatType: 'DD',
    _formatTypeSetter: function (value) {
      this.formatType = value;
      this.getFormattedValue();
    },

    outputString: null,

    coordinateEsriGeometry: null,
    _coordinateEsriGeometrySetter: function (value) {
        var pt;
        if (value == null) return;
      if (value.spatialReference.wkid !== 4326) {
        pt = EsriWMUtils.webMercatorToGeographic(value);
      } else {
        pt = value;
      }
      this.coordinateEsriGeometry = pt;
      this.getFormattedValue();
      dojoTopic.publish('COORDINATE_INPUT_TYPE_CHANGE', this);
    },

    /**
     *
     **/
    constructor: function (args) {
      dojoDeclare.safeMixin(this, args);
      this.util = new CoordinateUtilities(this.appConfig.geometryService);
    },

    /**
     *
     **/
    getInputType: function () {
      this.inputTypeDef = new DojoDeferred();
      var tc = this.util.getCoordinateType(this.inputString);
      if (tc && tc[tc.length-1]){
        this.inputType = tc[tc.length-1].name;
        this.util.getXYNotation(this.inputString, this.inputType).then(
          dojoLang.hitch(this, function (r) {
            if (r.length <= 0 || !r[0][0]){
              this.hasError = true;
              this.message = 'Invalid Coordinate';
              this.inputTypeDef.resolve(this);
              dojoTopic.publish('COORDINATE_INPUT_TYPE_CHANGE', this);
            } else {
              this.isManual = true;
              this.hasError = false;
              this.coordinateEsriGeometry = new EsriPoint(
                r[0][0],
                r[0][1],
                new EsriSpatialReference({
                  wkid: 4326
                })
              );
              this.message = '';
              this.inputTypeDef.resolve(this);
            }

          }),
          dojoLang.hitch(this, function (r) {
            this.hasError=true;
            this.inputType = 'UNKNOWN';
            this.message = 'Invalid Coordinate 2';
            dojoTopic.publish('COORDINATE_INPUT_TYPE_CHANGE', this);
            this.inputTypeDef.resolve(this);
          })
        );
      } else {
        this.hasError = true;
        this.inputType = 'UNKNOWN';
        this.message = 'Invalid Coordinate 3';
        this.inputTypeDef.resolve(this);
        dojoTopic.publish('COORDINATE_INPUT_TYPE_CHANGE', this);
      }

      return this.inputTypeDef;
    },

    /**
     *
     **/
    gettInputTypeSync: function () {
      var v = this.util.getCoordinateType(this.inputString);
      return v !== null;
    },

    /**
     *
     **/
    getFormattedValue: function () {
      if (!this.coordinateEsriGeometry) {
        return;
      }
      this.util.getCoordValues({
        x: this.coordinateEsriGeometry.x,
        y: this.coordinateEsriGeometry.y
      }, this.formatType, 4).then(dojoLang.hitch(this, function (r) {
        this.set('outputString', this.getCoordUI(r));
        dojoTopic.publish('COORDINATE_INPUT_FORMAT_CHANGE', this);
      }));
    },

    /**
     * Get coordinate notation in user provided format
     **/
    getCoordUI: function (fromValue) {
      var as = this.get('formatPrefix');
      var r;
      var formattedStr;
      switch (this.formatType) {
      case 'DD':
          r = this.util.getFormattedDDStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      case 'DDM':
          r = this.util.getFormattedDDMStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      case 'DMS':
          r = this.util.getFormattedDMSStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      case 'USNG':
          r = this.util.getFormattedUSNGStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      case 'MGRS':
          r = this.util.getFormattedMGRSStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      case 'GARS':
          r = this.util.getFormattedGARSStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      case 'UTM':
          r = this.util.getFormattedUTMStr(fromValue, this.formatString, as);
          formattedStr = r.formatResult;
          break;
      }
      dojoTopic.publish('COORDINATE_INPUT_FORMAT_CHANGE', this);
      return formattedStr;
    }
  });

  return mo;
});
