define(
[
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/connect",
  "dojo/_base/Color",
  "dojo/_base/window",

  "dojo/has",
  //should use dojo/sniff instead of dojo/_base/sniff
  //http://dojotoolkit.org/reference-guide/1.8/dojo/_base/sniff.html
  "dojo/sniff",
  "dojo/keys",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/dom-geometry",

  "./_toolbar",

  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/graphic",

  "esri/geometry/jsonUtils",
  "esri/geometry/webMercatorUtils",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/geometry/Multipoint",
  "esri/geometry/Rect",
  "esri/geometry/geometryEngine"
], function(
  declare, lang, array, connect, Color, win,
  has, dojoSniff, keys, domConstruct, domStyle, domGeometry,
  Toolbar,
  SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Graphic,
  jsonUtils, webMercatorUtils, Polyline, Polygon, Multipoint, Rect, GeomEngine
) {
  var DRAW = declare(Toolbar, {
    declaredClass: "esri.toolbars.Draw",
    _eventMap: {
      "draw-complete": true,
      "draw-end": ["geometry"]
    },
    constructor: function(/*esri.Map*/ map,  /*Object?*/ options) {
      //summary: Create a new toolbar to draw geometries (point, line,
      //         rect, polyline, polygon, circle, oval) on a map.
      this.markerSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SOLID, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2), new Color([0,0,0,0.25]));
      this.lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2);
      this.fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2), new Color([0,0,0,0.25]));

      this._points = [];

      this.map = map;

      this._mouse = !has("esri-touch") && !has("esri-pointer");

      // default options
      this._defaultOptions = {
          showTooltips: true,
          drawTime  : 75,
          tolerance : 8,
          tooltipOffset: 15
      };

      this._options = lang.mixin(lang.mixin({}, this._defaultOptions), options || {});

      // disable tooltip on touch devices
      if (dojoSniff("ios") || dojoSniff("android")) {
        this._options.showTooltips = false;
      }

      this._onKeyDownHandler = lang.hitch(this, this._onKeyDownHandler);
      this._onMouseDownHandler = lang.hitch(this, this._onMouseDownHandler);
      this._onMouseUpHandler = lang.hitch(this, this._onMouseUpHandler);
      this._onClickHandler = lang.hitch(this, this._onClickHandler);
      this._onMouseMoveHandler = lang.hitch(this, this._onMouseMoveHandler);
      this._onMouseDragHandler = lang.hitch(this, this._onMouseDragHandler);
      this._onDblClickHandler = lang.hitch(this, this._onDblClickHandler);
      this._updateTooltip = lang.hitch(this, this._updateTooltip);
      this._hideTooltip = lang.hitch(this, this._hideTooltip);
      this._redrawGraphic = lang.hitch(this, this._redrawGraphic);
    },

    _geometryType: null,
    respectDrawingVertexOrder: false,

    setRespectDrawingVertexOrder: function(set) {
      this.respectDrawingVertexOrder = set;
    },

    setMarkerSymbol: function(markerSymbol) {
      this.markerSymbol = markerSymbol;
    },

    setLineSymbol: function(lineSymbol) {
      this.lineSymbol = lineSymbol;
    },

    setFillSymbol: function(fillSymbol) {
      this.fillSymbol = fillSymbol;
    },

    activate: function(/*String*/ geometryType, /*Object?*/ options) {
      //summary: Activates tool to draw geometry
      // geometry: String: Geometry type to be drawn (esri.toolbar.Draw.GEOMETRIES.<type>)
      // symbol?: esri.symbol.Symbol: Symbology to be used to draw geometry
      if (this._geometryType) {
        this.deactivate();
      }

      var map = this.map,
          dc = connect.connect,
          Draw = DRAW;

      this._options = lang.mixin(lang.mixin({}, this._options), options || {});

      map.navigationManager.setImmediateClick(false);

      switch (geometryType) {
        case Draw.ARROW:
        case Draw.LEFT_ARROW:
        case Draw.RIGHT_ARROW:
        case Draw.UP_ARROW:
        case Draw.DOWN_ARROW:
        case Draw.TRIANGLE:
        case Draw.CIRCLE:
        case Draw.ELLIPSE:
        case Draw.RECTANGLE:
          this._deactivateMapTools(true, false, false, true);
          this._onClickHandler_connect = dc(map, "onClick", this._onClickHandler);

          //on multi-input devices SurfacePro, Chrome Pixel, Touch-screen laptops, etc we need to register handlers for both
          //mouse and touch events. The handlers already have preventDefault checks in them to prevent double triggering the event
          if(this._mouse){
            this._onMouseDownHandler_connect = dc(map, "onMouseDown", this._onMouseDownHandler);
            this._onMouseDragHandler_connect = dc(map, "onMouseDrag", this._onMouseDragHandler);
            this._onMouseUpHandler_connect = dc(map, "onMouseUp", this._onMouseUpHandler);
          }else{
            this._onMouseDownHandler2_connect = dc(map, "onMouseDragStart", this._onMouseDownHandler);
            this._onMouseDragHandler2_connect = dc(map, "onMouseDrag", this._onMouseDragHandler);
            this._onMouseUpHandler2_connect = dc(map, "onMouseDragEnd", this._onMouseUpHandler);
          }
          if(has("esri-touch") && !has("esri-pointer")){
            this._onMouseDownHandler2_connect = dc(map, "onSwipeStart", this._onMouseDownHandler);
            this._onMouseDragHandler2_connect = dc(map, "onSwipeMove", this._onMouseDragHandler);
            this._onMouseUpHandler2_connect = dc(map, "onSwipeEnd", this._onMouseUpHandler);
          }
          break;

        case Draw.POINT:
          this._onClickHandler_connect = dc(map, "onClick", this._onClickHandler);
          break;

        case Draw.LINE:
        case Draw.EXTENT:
        case Draw.FREEHAND_POLYLINE:
        case Draw.FREEHAND_POLYGON:
          this._deactivateMapTools(true, false, false, true);

          if(this._mouse){
            this._onMouseDownHandler_connect = dc(map, "onMouseDown", this._onMouseDownHandler);
            this._onMouseDragHandler_connect = dc(map, "onMouseDrag", this._onMouseDragHandler);
            this._onMouseUpHandler_connect = dc(map, "onMouseUp", this._onMouseUpHandler);
          }else{
            this._onMouseDownHandler_connect = dc(map, "onMouseDragStart", this._onMouseDownHandler);
            this._onMouseDragHandler_connect = dc(map, "onMouseDrag", this._onMouseDragHandler);
            this._onMouseUpHandler_connect = dc(map, "onMouseDragEnd", this._onMouseUpHandler);
          }
          if(has("esri-touch") && !has("esri-pointer")){
            this._onMouseDownHandler2_connect = dc(map, "onSwipeStart", this._onMouseDownHandler);
            this._onMouseDragHandler2_connect = dc(map, "onSwipeMove", this._onMouseDragHandler);
            this._onMouseUpHandler2_connect = dc(map, "onSwipeEnd", this._onMouseUpHandler);
          }

          break;

        case Draw.POLYLINE:
        case Draw.POLYGON:
        case Draw.MULTI_POINT:
          map.navigationManager.setImmediateClick(true);
          this._onClickHandler_connect = dc(map, "onClick", this._onClickHandler);
          this._onDblClickHandler_connect = dc(map, "onDblClick", this._onDblClickHandler);

          this._dblClickZoom = map.isDoubleClickZoom;
          map.disableDoubleClickZoom();
          break;

        default:
          console.error("Unsupported geometry type: " + geometryType);
          return;
      }

      this._onKeyDown_connect = dc(map, "onKeyDown", this._onKeyDownHandler);
      this._redrawConnect = dc(map, "onExtentChange", this._redrawGraphic);

      this._geometryType = geometryType;
      this._toggleTooltip(true);

      if (map.snappingManager && this._geometryType !== "freehandpolyline" && this._geometryType !== "freehandpolygon") {
        map.snappingManager._startSelectionLayerQuery();
        map.snappingManager._setUpSnapping();
      }

      this.onActivate(this._geometryType);
    },

    deactivate: function() {
      //summary: Deactivate draw tools
      var map = this.map;
      this._clear();

      var ddc = connect.disconnect;
      ddc(this._onMouseMoveHandler_connect);
      ddc(this._onMouseDownHandler_connect);
      ddc(this._onMouseDragHandler_connect);
      ddc(this._onMouseUpHandler_connect);
      ddc(this._onMouseDownHandler2_connect);
      ddc(this._onMouseDragHandler2_connect);
      ddc(this._onMouseUpHandler2_connect);
      ddc(this._onClickHandler_connect);
      ddc(this._onDblClickHandler_connect);
      ddc(this._onKeyDown_connect);
      ddc(this._redrawConnect);

      this._onMouseDownHandler_connect = this._onMouseMoveHandler_connect =
      this._onMouseDragHandler_connect = this._onMouseUpHandler_connect =
      this._onMouseDownHandler2_connect = this._onMouseDragHandler2_connect =
      this._onMouseUpHandler2_connect =
      this._onClickHandler_connect = this._onDblClickHandler_connect =
      this._onKeyDown_connect = this._redrawConnect = null;

      if (map.snappingManager) {
        map.snappingManager._stopSelectionLayerQuery();
        map.snappingManager._killOffSnapping();
      }

      switch (this._geometryType) {
        case DRAW.CIRCLE:
        case DRAW.ELLIPSE:
        case DRAW.TRIANGLE:
        case DRAW.ARROW:
        case DRAW.LEFT_ARROW:
        case DRAW.RIGHT_ARROW:
        case DRAW.UP_ARROW:
        case DRAW.DOWN_ARROW:
        case DRAW.RECTANGLE:
        case DRAW.LINE:
        case DRAW.EXTENT:
        case DRAW.FREEHAND_POLYLINE:
        case DRAW.FREEHAND_POLYGON:
          this._activateMapTools(true, false, false, true);
          break;

        case DRAW.POLYLINE:
        case DRAW.POLYGON:
        case DRAW.MULTI_POINT:
          if (this._dblClickZoom) {
            map.enableDoubleClickZoom();
          }
          break;
      }

      var geometryType = this._geometryType;
      this._geometryType = null;

      map.navigationManager.setImmediateClick(false);
      this._toggleTooltip(false);
      this.onDeactivate(geometryType);
    },

    _clear: function() {
      if (this._graphic) {
        this.map.graphics.remove(this._graphic, true);
      }

      if (this._tGraphic) {
        this.map.graphics.remove(this._tGraphic, true);
      }

      this._graphic = this._tGraphic = null;
      if (this.map.snappingManager) {
        this.map.snappingManager._setGraphic(null);
      }
      this._points = [];
    },

    finishDrawing : function() {
      var geometry,
          _pts = this._points,
          map = this.map,
          spatialReference = map.spatialReference,
          Draw = DRAW;

      _pts = _pts.slice(0, _pts.length);
      switch (this._geometryType) {
        case Draw.POLYLINE:
          if (! this._graphic || _pts.length < 2) {
            return;
          }

          geometry = new Polyline(spatialReference);
          geometry.addPath([].concat(_pts));
          break;
        case Draw.POLYGON:
          if (! this._graphic || _pts.length < 3) {
            return;
          }

          geometry = new Polygon(spatialReference);
          var ring = [].concat(_pts, [_pts[0].offset(0, 0)]); //this._points, [evt.mapPoint.offset(0, 0), this._points[0].offset(0, 0)]);

          if (! Polygon.prototype.isClockwise(ring) && ! this.respectDrawingVertexOrder) {
            console.debug(this.declaredClass + " :  Polygons drawn in anti-clockwise direction will be reversed to be clockwise.");
            ring.reverse();
          }
          geometry.addRing(ring);
          break;
        case Draw.MULTI_POINT:
          geometry = new Multipoint(spatialReference);
          array.forEach(_pts, function(pt) {
            geometry.addPoint(pt);
          });
          break;
      }

      connect.disconnect(this._onMouseMoveHandler_connect);
      this._clear();
      this._setTooltipMessage(0);
      this._drawEnd(geometry);
    },

    _drawEnd: function(geometry) {
      if (geometry) {
        var mapSR = this.map.spatialReference, geo;

        this.onDrawEnd(geometry);

        if (mapSR) {
          if (mapSR.isWebMercator()) {
            geo = webMercatorUtils.webMercatorToGeographic(geometry, true);
          }
          else if (mapSR.wkid === 4326) {
            geo = jsonUtils.fromJson(geometry.toJson());
          }
        }

        this.onDrawComplete({
          geometry: geometry,
          geographicGeometry: geo
        });
      }
    },

    _normalizeRect: function(start, end, spatialReference) {
      var sx = start.x,
          sy = start.y,
          ex = end.x,
          ey = end.y,
          width = Math.abs(sx - ex), // || 1;
          height = Math.abs(sy - ey); // || 1;
      return { x:Math.min(sx, ex), y:Math.max(sy, ey), width:width, height:height, spatialReference:spatialReference };
    },

    _onMouseDownHandler: function(evt) {
      console.log("_onMouseDownHandler");
      this._dragged = false;
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = snappingPoint || evt.mapPoint,
          Draw = DRAW,
          map = this.map,
          spatialReference = map.spatialReference;

      this._points.push(start.offset(0, 0));
      switch (this._geometryType) {
        case Draw.LINE:
          this._graphic = map.graphics.add(new Graphic(new Polyline({ paths:[[[start.x, start.y], [start.x, start.y]]], spatialReference:spatialReference }), this.lineSymbol), true);
          if (map.snappingManager) {
            map.snappingManager._setGraphic(this._graphic);
          }
          break;

        case Draw.EXTENT:
          //this._graphic = map.graphics.add(new esri.Graphic(new esri.geometry.Rect(start.x, start.y, 0, 0, spatialReference), this.fillSymbol), true);
          break;

        case Draw.FREEHAND_POLYLINE:
          this._oldPoint = evt.screenPoint;
          var polyline = new Polyline(spatialReference);
          polyline.addPath(this._points);
          this._graphic = map.graphics.add(new Graphic(polyline, this.lineSymbol), true);
          if (map.snappingManager) {
            map.snappingManager._setGraphic(this._graphic);
          }
          break;

        case Draw.CIRCLE:
        case Draw.ELLIPSE:
        case Draw.TRIANGLE:
        case Draw.ARROW:
        case Draw.LEFT_ARROW:
        case Draw.RIGHT_ARROW:
        case Draw.UP_ARROW:
        case Draw.DOWN_ARROW:
        case Draw.RECTANGLE:
        case Draw.FREEHAND_POLYGON:
          this._oldPoint = evt.screenPoint;
          var polygon = new Polygon(spatialReference);
          polygon.addRing(this._points);
          this._graphic = map.graphics.add(new Graphic(polygon, this.fillSymbol), true);
          if (map.snappingManager) {
            map.snappingManager._setGraphic(this._graphic);
          }
          break;
      }

      if ( has("esri-touch") ) {
        // This is essential to stop iOS from firing
        // synthesized(delayed) mouse events later.
        // Why?
        // Typically users deactivate the toolbar onDrawEnd. But
        // delayed mouse events are synthesized and fired after
        // deactivate happens - at this point graphics layer events
        // are active and will capture over-down-up-click events. Now
        // if the app is wired to activate edit toolbar on map.graphics.click,
        // this will cause edit toolbars to appear right after the user has
        // finished drawing the geometry - this is not desirable.
        evt.preventDefault();

        // Alternative solution is for the apps to do this in onDrawEnd handler:
        //   setTimeout(function() { drawToolbar.deactivate(); }, 0);
        // This new JS context will be executed after the browser has finished
        // firing the delayed mouse events. Hence there is no chance for
        // graphics layers to inadvertently catch these events and act on them.
      }
    },

    _onMouseMoveHandler: function(evt) {
      console.log("_onMouseMoveHandler");
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = this._points[0], /*this._points[this._points.length - 1],*/
          end = snappingPoint || evt.mapPoint,
          tGraphic = this._tGraphic, geom = tGraphic.geometry;

      switch (this._geometryType) {
        case DRAW.POLYLINE:
        case DRAW.POLYGON:
          //_tGraphic.setGeometry(dojo.mixin(_tGraphic.geometry, { paths:[[[start.x, start.y], [end.x, end.y]]] }));
          geom.setPoint(0, 0, { x: start.x, y: start.y });
          geom.setPoint(0, 1, { x: end.x, y: end.y });
          tGraphic.setGeometry(geom);
          break;
      }
    },

    _onMouseDragHandler: function(evt) {
      console.log("_onMouseMoveDragHandler");
      // Pressing escape while drawing causing errors for certain draw tools
      // -- Issue #1381
      if(!this._graphic && !this._points.length){
        return;
      }

      // BlackBerry legacy issue (not changing for 3x)
      if (has("esri-touch") && !this._points.length) {
        // BlackBerry Torch certainly needs this
        // to prevent page from panning
        evt.preventDefault();
        return;
      }

      this._dragged = true;
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = this._points[0],
          end = snappingPoint || evt.mapPoint,
          map = this.map,
          spatialReference = map.spatialReference,
          _graphic = this._graphic,
          Draw = DRAW,
          startScreenPoint = map.toScreen(start),
          endScreenPoint = map.toScreen(end),
          pts = [],
          a = endScreenPoint.x - startScreenPoint.x,
          b = endScreenPoint.y - startScreenPoint.y,
          numPts = 60,
          d = Math.sqrt(a*a + b*b);

      switch (this._geometryType) {
        case Draw.CIRCLE:
          this._hideTooltip();
          _graphic.geometry = Polygon.createCircle({
                                center: startScreenPoint,
                                r: d,
                                numberOfPoints: numPts,
                                map: map
                              });
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.ELLIPSE:
          this._hideTooltip();
          _graphic.geometry = Polygon.createEllipse({
                                center: startScreenPoint,
                                longAxis: a,
                                shortAxis: b,
                                numberOfPoints: numPts,
                                map: map
                              });
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.TRIANGLE:
          this._hideTooltip();
          pts = [[0,-d],[0.8660254037844386*d,0.5*d],[-0.8660254037844386*d,0.5*d],[0,-d]];
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.ARROW:
          this._hideTooltip();
          var sina = b/d, cosa = a/d, tana = b/a;
          var f = cosa * 0.25 * d, e = 0.25*d/tana, g = sina*0.25*d;
          pts = [[a,b],[a-f*(1+24/e),b+24*cosa-g],[a-f*(1+12/e),b+12*cosa-g],[-12*sina,12*cosa],[12*sina,-12*cosa],[a-f*(1-12/e),b-12*cosa-g],[a-f*(1-24/e),b-24*cosa-g],[a,b]];
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.LEFT_ARROW:
          this._hideTooltip();
          if (a <= 0) {
            pts = [[a,0],[0.75*a,b],[0.75*a,0.5*b],[0,0.5*b],[0,-0.5*b],[0.75*a,-0.5*b],[0.75*a,-b],[a,0]];
          }
          else {
            pts = [[0,0],[0.25*a,b],[0.25*a,0.5*b],[a,0.5*b],[a,-0.5*b],[0.25*a,-0.5*b],[0.25*a,-b],[0,0]];
          }
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.RIGHT_ARROW:
          this._hideTooltip();
          if (a >= 0) {
            pts = [[a,0],[0.75*a,b],[0.75*a,0.5*b],[0,0.5*b],[0,-0.5*b],[0.75*a,-0.5*b],[0.75*a,-b],[a,0]];
          }
          else {
            pts = [[0,0],[0.25*a,b],[0.25*a,0.5*b],[a,0.5*b],[a,-0.5*b],[0.25*a,-0.5*b],[0.25*a,-b],[0,0]];
          }
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.UP_ARROW:
          this._hideTooltip();
          if (b <= 0) {
            pts = [[0,b],[-a,0.75*b],[-0.5*a,0.75*b],[-0.5*a,0],[0.5*a,0],[0.5*a,0.75*b],[a,0.75*b],[0,b]];
          }
          else {
            pts = [[0,0],[-a,0.25*b],[-0.5*a,0.25*b],[-0.5*a,b],[0.5*a,b],[0.5*a,0.25*b],[a,0.25*b],[0,0]];
          }
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.DOWN_ARROW:
          this._hideTooltip();
          if (b >= 0) {
            pts = [[0,b],[-a,0.75*b],[-0.5*a,0.75*b],[-0.5*a,0],[0.5*a,0],[0.5*a,0.75*b],[a,0.75*b],[0,b]];
          }
          else {
            pts = [[0,0],[-a,0.25*b],[-0.5*a,0.25*b],[-0.5*a,b],[0.5*a,b],[0.5*a,0.25*b],[a,0.25*b],[0,0]];
          }
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.RECTANGLE:
          this._hideTooltip();
          pts = [[0,0],[a,0],[a,b],[0,b], [0,0]];
          _graphic.geometry = this._toPolygon(pts, startScreenPoint.x, startScreenPoint.y);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.LINE:
          _graphic.setGeometry(lang.mixin(_graphic.geometry, { paths:[[[start.x, start.y], [end.x, end.y]]] }));
          break;
        case Draw.EXTENT:
          if (_graphic) {
            map.graphics.remove(_graphic, true);
          }
          var rect = new Rect(this._normalizeRect(start, end, spatialReference));
          // TODO
          // We can remove this once graphics layer is able to duplicate
          // rects/extens when wrapping (we may have to render them as polygons).
          rect._originOnly = true;
          this._graphic = map.graphics.add(new Graphic(rect, this.fillSymbol), true);
          if (map.snappingManager) {
            map.snappingManager._setGraphic(this._graphic);
          }
          // _graphic.setGeometry(dojo.mixin(_graphic.geometry, this._normalizeRect(start, end, spatialReference)));
          break;
        case Draw.FREEHAND_POLYLINE:
          this._hideTooltip();
          if (this._canDrawFreehandPoint(evt) === false){
              if (has("esri-touch")) {
                // BlackBerry Torch certainly needs this
                // to prevent page from panning
                evt.preventDefault();
              }
              return;
          }

          this._points.push(evt.mapPoint.offset(0, 0));
          _graphic.geometry._insertPoints([end.offset(0, 0)], 0);
          _graphic.setGeometry(_graphic.geometry);
          break;
        case Draw.FREEHAND_POLYGON:
          this._hideTooltip();
          if (this._canDrawFreehandPoint(evt) === false){
              if (has("esri-touch")) {
                // BlackBerry Torch certainly needs this
                // to prevent page from panning
                evt.preventDefault();
              }
              return;
          }

          this._points.push(evt.mapPoint.offset(0, 0));
          _graphic.geometry._insertPoints([end.offset(0, 0)], 0);
          _graphic.setGeometry(_graphic.geometry);
          break;
      }

      if (has("esri-touch")) {
        // Prevent iOS from panning the web page
        evt.preventDefault();
      }
    },

    _canDrawFreehandPoint : function(evt) {
        if (!this._oldPoint){
            return false;
        }

        var dx = this._oldPoint.x - evt.screenPoint.x;
        dx = (dx < 0) ? dx * -1 : dx;

        var dy = this._oldPoint.y - evt.screenPoint.y;
        dy = (dy < 0) ? dy * -1 : dy;

        var tolerance = this._options.tolerance;
        if (dx < tolerance && dy < tolerance){
            return false;
        }

        var now = new Date();
        var timeDiff = now - this._startTime;
        if (timeDiff < this._options.drawTime){
            return false;
        }

        this._startTime = now;
        this._oldPoint = evt.screenPoint;
        return true;
    },

    _onMouseUpHandler: function(evt) {
      console.log("_onMouseUpHandler");
      // 3.14 #1381 Fix
      // -- Pressing escape while drag drawing will clear the _graphic
      // -- This keeps the tool active instead of firing an error in console
      if (!this._dragged || !this._graphic) {
        // It is not going to be a valid geometry.
        // Clear state and return. Do not fire onDrawEnd.
        this._clear();
        return;
      }

      // IE seems to have a problem when double clicking on the map
      // when polyline/polygon/multipoint tool is active.
      if (this._points.length === 0) {
        this._points.push(evt.mapPoint.offset(0,0));
      }
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = this._points[0],
          end = snappingPoint || evt.mapPoint,
          map = this.map,
          spatialReference = map.spatialReference,
          Draw = DRAW,
          geometry;

      switch (this._geometryType) {
        case Draw.CIRCLE:
        case Draw.ELLIPSE:
        case Draw.TRIANGLE:
        case Draw.ARROW:
        case Draw.LEFT_ARROW:
        case Draw.RIGHT_ARROW:
        case Draw.UP_ARROW:
        case Draw.DOWN_ARROW:
        case Draw.RECTANGLE:
          geometry = this._graphic.geometry;
          break;

        case Draw.LINE:
          geometry = new Polyline({ paths:[[[start.x, start.y], [end.x, end.y]]], spatialReference:spatialReference });
          break;

        case Draw.EXTENT:
          geometry = (new Rect(this._normalizeRect(start, end, spatialReference))).getExtent();
          break;

        case Draw.FREEHAND_POLYLINE:
          geometry = new Polyline(spatialReference);
          geometry.addPath([].concat(this._points, [end.offset(0, 0)]));
          break;

        case Draw.FREEHAND_POLYGON:
          geometry = new Polygon(spatialReference);
          var ring = [].concat(this._points, [end.offset(0, 0), this._points[0].offset(0, 0)]);

          if (! Polygon.prototype.isClockwise(ring) && ! this.respectDrawingVertexOrder) {
            console.debug(this.declaredClass + " :  Polygons drawn in anti-clockwise direction will be reversed to be clockwise.");
            ring.reverse();
          }

          geometry.addRing(ring);
          break;
      }

      if (has("esri-touch")) {
        evt.preventDefault();
      }

      this._clear();
      this._drawEnd(geometry);
    },

    _onClickHandler: function(evt) {
      console.log("_onClickHandler");

      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = snappingPoint || evt.mapPoint,
          map = this.map,
          screenPoint = map.toScreen(start),
          Draw = DRAW,
          tGraphic, geom, polygon;

      this._points.push(start.offset(0, 0));
      switch (this._geometryType) {
        case Draw.POINT:
          this._drawEnd(start.offset(0, 0));
          this._setTooltipMessage(0);
          break;
        case Draw.POLYLINE:
          if (this._points.length === 3) {
            this._onDblClickHandler();
            return;
          }
          if (this._points.length === 1) {
            var polyline = new Polyline(map.spatialReference);
            polyline.addPath(this._points);
            this._graphic = map.graphics.add(new Graphic(polyline, this.lineSymbol), true);
            if (map.snappingManager) {
              map.snappingManager._setGraphic(this._graphic);
            }
            this._onMouseMoveHandler_connect = connect.connect(map, "onMouseMove", this._onMouseMoveHandler);

            this._tGraphic = map.graphics.add(new Graphic(new Polyline({
              paths: [[[start.x, start.y], [start.x, start.y]]],
              spatialReference: map.spatialReference
            }), this.lineSymbol), true);
          }
          else {
            this._graphic.geometry._insertPoints([start.offset(0, 0)], 0);
            // map.graphics.remove(this._tGraphic, true);
            this._graphic.setGeometry(this._graphic.geometry).setSymbol(this.lineSymbol);

            tGraphic = this._tGraphic;
            geom = tGraphic.geometry;
            //geom._insertPoints([start.offset(0, 0), start.offset(0, 0)], 0);
            geom.setPoint(0, 0, start.offset(0, 0));
            geom.setPoint(0, 1, start.offset(0, 0));
            tGraphic.setGeometry(geom);
          }
          break;
        case Draw.POLYGON:
          if (this._points.length === 1) {
            polygon = new Polygon(map.spatialReference);
            polygon.addRing(this._points);
            this._graphic = map.graphics.add(new Graphic(polygon, this.fillSymbol), true);
            if (map.snappingManager) {
              map.snappingManager._setGraphic(this._graphic);
            }
            this._onMouseMoveHandler_connect = connect.connect(map, "onMouseMove", this._onMouseMoveHandler);

            /*
             * IE gets confused when we delete and create this polyline every
             * time a point is added. Deleting and inserting a node
             * on which click happened clobbers double-click event.
             * Note - click/double-click to add a point sometimes falls
             * on this polyline which is the root of the problem in IE.
             * POLYLINE tool above has the same problem
             */
            this._tGraphic = map.graphics.add(new Graphic(new Polyline({ paths: [[[start.x, start.y], [start.x, start.y]]], spatialReference: map.spatialReference }), this.fillSymbol), true);
          }
          else {
            this._graphic.geometry._insertPoints([start.offset(0, 0)], 0);
//            map.graphics.remove(this._tGraphic, true);
            this._graphic.setGeometry(this._graphic.geometry).setSymbol(this.fillSymbol);

            tGraphic = this._tGraphic;
            geom = tGraphic.geometry;
            //geom._insertPoints([start.offset(0, 0), start.offset(0, 0)], 0);
            geom.setPoint(0, 0, start.offset(0, 0));
            geom.setPoint(0, 1, start.offset(0, 0));
            tGraphic.setGeometry(geom);
          }
          break;
        case Draw.MULTI_POINT:
          var tps = this._points;
          if (tps.length === 1) {
            var multiPoint = new Multipoint(map.spatialReference);
            multiPoint.addPoint(tps[tps.length - 1]);
            this._graphic = map.graphics.add(new Graphic(multiPoint, this.markerSymbol), true);
            if (map.snappingManager) {
              map.snappingManager._setGraphic(this._graphic);
            }
          }
          else {
            this._graphic.geometry.addPoint(tps[tps.length - 1]);
            this._graphic.setGeometry(this._graphic.geometry).setSymbol(this.markerSymbol);
          }
          break;

        case Draw.ARROW:
           this._addShape(
             [[0,0],[-24,24],[-24,12],[-96,12],[-96,-12],[-24,-12],[-24,-24],[0,0]],
             screenPoint.x,
             screenPoint.y
           );
           break;

        case Draw.LEFT_ARROW:
           this._addShape(
             [[0,0],[24,24],[24,12],[96,12],[96,-12],[24,-12],[24,-24],[0,0]],
             screenPoint.x,
             screenPoint.y
           );
           break;

        case Draw.RIGHT_ARROW:
           this._addShape(
             [[0,0],[-24,24],[-24,12],[-96,12],[-96,-12],[-24,-12],[-24,-24],[0,0]],
             screenPoint.x,
             screenPoint.y
           );
           break;

        case Draw.UP_ARROW:
           this._addShape(
             [[0,0],[-24,24],[-12,24],[-12,96],[12,96],[12,24],[24,24],[0,0]],
             screenPoint.x,
             screenPoint.y
           );
           break;

        case Draw.DOWN_ARROW:
           this._addShape(
             [[0,0],[-24,-24],[-12,-24],[-12,-96],[12,-96],[12,-24],[24,-24],[0,0]],
             screenPoint.x,
             screenPoint.y
           );
           break;

        case Draw.TRIANGLE:
           this._addShape(
             [[0,-48],[41.56921938165306,24],[-41.56921938165306,24],[0,-48]],
             screenPoint.x,
             screenPoint.y
           );
           break;

        case Draw.RECTANGLE:
           this._addShape(
             [[0,-96],[96,-96],[96,0],[0,0], [0,-96]],
             screenPoint.x - 48,
             screenPoint.y + 48
           );
           break;

        case Draw.CIRCLE:
           this._clear();
           this._drawEnd(Polygon.createCircle({
             center: screenPoint,
             r: 48,
             numberOfPoints: 60,
             map: map
           }));
           break;

        case Draw.ELLIPSE:
           this._clear();
           this._drawEnd(Polygon.createEllipse({
             center: screenPoint,
             longAxis: 48,
             shortAxis: 24,
             numberOfPoints: 60,
             map: map
           }));
           break;
      }

      this._setTooltipMessage(this._points.length);
      if (this._points.length === 2 && this._geometryType === 'polyline') {
        var tooltip = this._tooltip;
        if (tooltip) {
          tooltip.innerHTML = "Click to finish drawing";
        }
      }
    },

    _addShape : function(path, dx, dy){
       this._setTooltipMessage(0);
       this._clear();
       this._drawEnd(this._toPolygon(path, dx, dy));
    },

    _toPolygon : function(path, dx, dy){
        var map = this.map;
        var polygon = new Polygon(map.spatialReference);
        polygon.addRing(array.map(path, function(pt) { return map.toMap( {x:pt[0] + dx, y:pt[1] + dy}); }));
        return polygon;
    },

    _onDblClickHandler: function(evt) {
      console.log("_onDblClickHandler");
      var geometry,
          _pts = this._points,
          map = this.map,
          spatialReference = map.spatialReference,
          Draw = DRAW;

      if (has("esri-touch")) {
        _pts.push(evt.mapPoint);
      }

      //_pts = _pts.slice(0, _pts.length); // - (1 + (dojo.isIE ? 0: 1)));
      var currentVertex = _pts[_pts.length-1];
      var previousVertex = _pts[_pts.length-2];

      if(currentVertex && previousVertex && currentVertex.x === previousVertex.x && currentVertex.y === previousVertex.y){
        _pts = _pts.slice(0, _pts.length - 1); // - (1 + (dojo.isIE ? 0: 1)));
      }else{
        _pts = _pts.slice(0, _pts.length);
      }

      switch (this._geometryType) {
        case Draw.POLYLINE:
          if (! this._graphic || _pts.length < 2) {
            connect.disconnect(this._onMouseMoveHandler_connect);
            this._clear();
            this._onClickHandler(evt);
            return;
          }

          geometry = new Polygon(spatialReference);
          var majorAxisGeom = new Polyline({ paths:[[[_pts[0].x, _pts[0].y], [_pts[1].x, _pts[1].y]]], spatialReference:spatialReference });
          var minorAxisGeom = new Polyline({ paths:[[[_pts[0].x, _pts[0].y], [_pts[2].x, _pts[2].y]]], spatialReference:spatialReference });
          var majorAxisLength = GeomEngine.geodesicLength(majorAxisGeom, 9001);
          var minorAxisLength = GeomEngine.geodesicLength(minorAxisGeom, 9001);
          // geometry.addPath([].concat(_pts)); //this._points, [evt.mapPoint.offset(0, 0)]));

          var centerScreenPoint = this.map.toScreen(_pts[0]);
          var majorScreenPoint = this.map.toScreen(_pts[1]);
          var minorScreenPoint = this.map.toScreen(_pts[2]);

          var a = majorScreenPoint.x - centerScreenPoint.x;
          var b = minorScreenPoint.y - centerScreenPoint.y;

          geometry.geometry = Polygon.createEllipse({
            center: this.map.toScreen(_pts[0]),
            longAxis: a,
            shortAxis: b,
            numberOfPoints: 60,
            map: this.map
          });

          var delx = _pts[1].y - _pts[0].y;
          var dely = _pts[2].x - _pts[0].x;

          var azi = Math.atan2(dely, delx) * 180 / Math.PI;
          var br = ((azi + 360) % 360);

          geometry = lang.mixin(geometry, {
            majorAxisLength: majorAxisLength,
            minorAxisLength: minorAxisLength,
            angle: br.toFixed(2),
            drawType: "ellipse",
            center: _pts[0]
          })
          break;
        case Draw.POLYGON:
          if (! this._graphic || _pts.length < 2) { //this._points.length < 2) {
            connect.disconnect(this._onMouseMoveHandler_connect);
            this._clear();
            this._onClickHandler(evt);
            return;
          }

          geometry = new Polygon(spatialReference);
          var ring = [].concat(_pts, [_pts[0].offset(0, 0)]); //this._points, [evt.mapPoint.offset(0, 0), this._points[0].offset(0, 0)]);

          if (! Polygon.prototype.isClockwise(ring) && ! this.respectDrawingVertexOrder) {
            console.debug(this.declaredClass + " :  Polygons drawn in anti-clockwise direction will be reversed to be clockwise.");
            ring.reverse();
          }

          geometry.addRing(ring);
          break;
        case Draw.MULTI_POINT:
          geometry = new Multipoint(spatialReference);
          array.forEach(_pts, function(pt) {
            geometry.addPoint(pt);
          });

          // if (this._graphic) {
          //   var geom = this._graphic.geometry;
          //   // geom.addPoint(evt.mapPoint.offset(0, 0));
          //   // geometry = new esri.geometry.Multipoint({ points:[].concat([], geom.points.slice(0, geom.points.length - 1)), spatialReference: spatialReference });
          // }
          // else {
          //   geometry = new esri.geometry.Multipoint(spatialReference);
          //   geometry.addPoint(evt.mapPoint.offset(0, 0));
          // }
          break;
      }

      connect.disconnect(this._onMouseMoveHandler_connect);
      this._clear();
      this._setTooltipMessage(0);
      this._drawEnd(geometry);
    },

    _onKeyDownHandler : function(evt) {
      console.log("_onKeyDownHandler");
      if (evt.keyCode === keys.ESCAPE) {
        connect.disconnect(this._onMouseMoveHandler_connect);
        this._clear();
        this._setTooltipMessage(0);
      }
    },

    _toggleTooltip: function(show) {
      if (!this._options.showTooltips){
          return;
      }

      if (show) { // enable if not already enabled
        if (this._tooltip) {
          return;
        }

        var domNode = this.map.container;
        this._tooltip = domConstruct.create("div", { "class": "tooltip" }, domNode);
		//same logic as popup handles RTL
        if (!domGeometry.isBodyLtr()) {
          domStyle.set(this._tooltip, "direction", "rtl");
        }
        this._tooltip.style.display = "none";
        this._tooltip.style.position = "fixed";

        this._setTooltipMessage(0);

        this._onTooltipMouseEnterHandler_connect = connect.connect(this.map, "onMouseOver", this._updateTooltip);
        this._onTooltipMouseLeaveHandler_connect = connect.connect(this.map, "onMouseOut",  this._hideTooltip);
        this._onTooltipMouseMoveHandler_connect = connect.connect(this.map, "onMouseMove",  this._updateTooltip);
      }
      else { // disable
        if (this._tooltip) {
          connect.disconnect(this._onTooltipMouseEnterHandler_connect);
          connect.disconnect(this._onTooltipMouseLeaveHandler_connect);
          connect.disconnect(this._onTooltipMouseMoveHandler_connect);
          domConstruct.destroy(this._tooltip);
          this._tooltip = null;
        }
      }
    },

    _hideTooltip : function() {
      var tooltip = this._tooltip;
      if (!tooltip){
          return;
      }

      tooltip.style.display = "none";
    },

    _setTooltipMessage : function(numPoints) {
     var tooltip = this._tooltip;
        if (!tooltip){
            return;
        }

     var points = numPoints;
     var message = "";
     switch (this._geometryType) {
        case DRAW.POINT:
          message = "Click to add point";
          break;
        case DRAW.ARROW:
        case DRAW.LEFT_ARROW:
        case DRAW.RIGHT_ARROW:
        case DRAW.UP_ARROW:
        case DRAW.DOWN_ARROW:
        case DRAW.TRIANGLE:
        case DRAW.RECTANGLE:
        case DRAW.CIRCLE:
        case DRAW.ELLIPSE:
          message = "Click to add a shape, or press down to start and let go to finish";
          break;
        case DRAW.LINE:
        case DRAW.EXTENT:
        case DRAW.FREEHAND_POLYLINE:
        case DRAW.FREEHAND_POLYGON:
          message = "Press down to start and let go to finish";
          break;
        case DRAW.POLYLINE:
        case DRAW.POLYGON:
           message = "Click to start drawing";
           if (points === 1){
             message = "Click to continue drawing";
           } else if (points >= 2) {
             message = "Double-click to complete";
           }
           break;
        case DRAW.MULTI_POINT:
            message = "Click to start adding points";
            if (points >= 1) {
                message = "Double-click to finish";
              }
            break;
      }

      tooltip.innerHTML = message;
    },

    _updateTooltip : function(evt) {
        var tooltip = this._tooltip;
        if (!tooltip){
            return;
        }

        var px, py;
        if (evt.clientX || evt.pageY) {
            px = evt.clientX;
            py = evt.clientY;
        } else {
            px = evt.clientX + win.body().scrollLeft - win.body().clientLeft;
            py = evt.clientY + win.body().scrollTop - win.body().clientTop;
        }

        tooltip.style.display = "none";
        domStyle.set(tooltip, { left: (px + this._options.tooltipOffset) + "px", top: py + "px" });
        tooltip.style.display = "";
    },

    _redrawGraphic: function(extent, delta, levelChange, lod) {
      if (levelChange || this.map.wrapAround180) {
        var g = this._graphic;
        if (g) {
          g.setGeometry(g.geometry);
        }

        g = this._tGraphic;
        if (g) {
          g.setGeometry(g.geometry);
        }
      }
    },

   /*********
   * Events
   *********/

    onActivate: function() {
      // Arguments:
      //  <String> geometryType
    },

    onDeactivate: function() {
      // Arguments:
      //  <String> geometryType
    },

    onDrawComplete: function() {},

    onDrawEnd: function() {
      //summary: Event fired when a new geometry drawing is complete.
      //         arguments[0]: esri.geometry.Point: If geometryType == esri.toolbar.Draw.POINT
      //         arguments[0]: esri.geometry.Rect: If geometryType == esri.toolbar.Draw.RECT
      //         arguments[0]: esri.geometry.Extent: If geometryType == esri.toolbar.Draw.EXTENT
      //         arguments[0]: esri.geometry.Polyline: If geometryType == esri.toolbar.Draw.POLYLINE
      //         arguments[0]: esri.geometry.Polyline: If geometryType == esri.toolbar.Draw.FREEHAND_POLYLINE
      //         arguments[0]: esri.geometry.Polygon: If geometryType == esri.toolbar.Draw.POLYGON
      //         arguments[0]: esri.geometry.Polygon: If geometryType == esri.toolbar.Draw.FREEHAND_POLYGON
      //         arguments[0]: esri.geometry.Line: If geometryType == esri.toolbar.Draw.LINE
      //         arguments[0]: esri.geometry.Circle: If geometryType == esri.toolbar.Draw.CIRCLE
      //         arguments[0]: esri.geometry.Ellipse: If geometryType == esri.toolbar.Draw.ELLIPSE
    }
  });

  lang.mixin(DRAW, {
    POINT: "point",
    MULTI_POINT: "multipoint",
    LINE: "line",
    EXTENT: "extent",
    POLYLINE: "polyline",
    POLYGON:"polygon",
    FREEHAND_POLYLINE:"freehandpolyline",
    FREEHAND_POLYGON:"freehandpolygon",
    ARROW:"arrow",
    LEFT_ARROW:"leftarrow",
    RIGHT_ARROW:"rightarrow",
    UP_ARROW:"uparrow",
    DOWN_ARROW:"downarrow",
    TRIANGLE:"triangle",
    CIRCLE:"circle",
    ELLIPSE:"ellipse",
    RECTANGLE:"rectangle"
  });

  // if (has("extend-esri")) {
  //   lang.setObject("toolbars.Draw", DRAW, esriNS);
  // }

  return DRAW;
});
