define(
[
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/has",

  /*"../kernel",*/
  "./Evented"
], function(
  declare, lang, has,
  /*esriNS*,*/ esriEvented
) {
  var TB = declare([esriEvented], {
    declaredClass: "esri.toolbars._Toolbar",
    constructor: function(/*esri.Map*/ map) {
      this.map = map;
    },

    _cursors: {
      "move": "pointer",
      "move-v": "pointer",
      "move-gv": "pointer",
      "box0": "nw-resize",
      "box1": "n-resize",
      "box2": "ne-resize",
      "box3": "e-resize",
      "box4": "se-resize",
      "box5": "s-resize",
      "box6": "sw-resize",
      "box7": "w-resize",
      "box8": "pointer"
    },

    _deactivateMapTools: function(nav, slider, fixedPan, graphics) {
      var map = this.map;

      if (nav) {
        //store map navigation state so that when deactivated, the map's navigation state is restored to original
        this._mapNavState = { isDoubleClickZoom:map.isDoubleClickZoom, isClickRecenter:map.isClickRecenter, isPan:map.isPan,
          isRubberBandZoom:map.isRubberBandZoom, isKeyboardNavigation:map.isKeyboardNavigation, isScrollWheelZoom:map.isScrollWheelZoom };
        map.disableDoubleClickZoom();
        map.disableClickRecenter();
        map.disablePan();
        map.disableRubberBandZoom();
        map.disableKeyboardNavigation();
      }
      if (slider) {
        map.hideZoomSlider();
      }
      if (fixedPan) {
        map.hidePanArrows();
      }
      if (graphics) {
        map.graphics.disableMouseEvents();
      }
    },

    _activateMapTools: function(nav, slider, fixedPan, graphics) {
      var map = this.map,
          navState = this._mapNavState;

      if (nav && navState) {
        if (navState.isDoubleClickZoom) {
          map.enableDoubleClickZoom();
        }
        if (navState.isClickRecenter) {
          map.enableClickRecenter();
        }
        if (navState.isPan) {
          map.enablePan();
        }
        if (navState.isRubberBandZoom) {
          map.enableRubberBandZoom();
        }
        if (navState.isKeyboardNavigation) {
          map.enableKeyboardNavigation();
        }
        if (navState.isScrollWheelZoom) {
          map.enableScrollWheelZoom();
        }
      }
      if (slider) {
        map.showZoomSlider();
      }
      if (fixedPan) {
        map.showPanArrows();
      }
      if (graphics) {
        map.graphics.enableMouseEvents();
      }
    }
  });

  // if (has("extend-esri")) {
  //   lang.setObject("toolbars._Toolbar", TB, esriNS);
  // }

  return TB;
});
