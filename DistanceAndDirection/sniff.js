define(
[
  "dojo/_base/sniff",
  "./kernel"
],
function(has, esriNS) {

  var isFF     = has("ff"),
      isIE     = has("ie"),
      // stdIE will be true for IE 11+ in standards mode
      // Trident = 7 for IE 11
      // http://mail.dojotoolkit.org/pipermail/dojo-interest/2013-December/079827.html
      stdIE    = (isIE === undefined && has("trident") >= 7),
      isWebKit = has("webkit"),
      isOpera  = has("opera"),
      isChrome = has("chrome"),
      isSafari = has("safari");

  /**********************
   * Mobile OS detection
   **********************/

  var nua = navigator.userAgent, match;
  //esri.isiPhone = esri.isAndroid = 0;

  match = nua.match(/(iPhone|iPad|CPU)\s+OS\s+(\d+\_\d+)/i);
  if (match) {
    has.add("esri-iphone", parseFloat(match[2].replace("_", ".")));
  }

  match = nua.match(/Android\s+(\d+\.\d+)/i);
  if (match) {
    has.add("esri-android", parseFloat(match[1]));
    // Firefox Mobile does not have version number after "Android"
    // So esri.isAndroid will be undefined
  }

  match = nua.match(/Fennec\/(\d+\.\d+)/i);
  if (match) {
    has.add("esri-fennec", parseFloat(match[1]));
  }

  if (nua.indexOf("BlackBerry") >= 0) {
    if (nua.indexOf("WebKit") >= 0) {
      has.add("esri-blackberry", 1);
    }
  }

  has.add("esri-touch", (
    has("esri-iphone") || 
    has("esri-android") || 
    has("esri-blackberry") || 
    (has("esri-fennec") >= 6) ||
    ((isFF || isWebKit) && document.createTouch)
  ) ? true : false);
  
  match = nua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile/i);
  if(match){
    has.add("esri-mobile", match);
  }
  
  /*// Future Work
  if (!esri.isTouchEnabled) {
    // References:
    // http://modernizr.github.com/Modernizr/touch.html
    // http://stackoverflow.com/questions/2607248/optimize-website-for-touch-devices
    esri.isTouchEnabled = "ontouchstart" in document;
  }*/
  
  // Thank you IE!
  has.add("esri-pointer", navigator.pointerEnabled || navigator.msPointerEnabled);
  // NOTE
  // Pointer enabled devices typically have multiple input devices: touch, mouse or pen.
  // Given that, isPointerEnabled doesn't necessarily mean touch enabled in the
  // traditional sense. In addition, the device could receive events from any of those
  // devices at any moment.
  // See:
  // http://msdn.microsoft.com/en-us/library/hh673557.aspx
  // http://www.w3.org/TR/pointerevents/

  esriNS._getDOMAccessor = function(propName) {
    var prefix = "";

    if (isFF) {
      prefix = "Moz";
    }
    else if (isWebKit) {
      prefix = "Webkit";
    }
    else if (isIE) {
      prefix = "ms";
    }
    else if (isOpera) {
      prefix = "O";
    }

    return prefix + propName.charAt(0).toUpperCase() + propName.substr(1);
  };
  
  has.add("esri-phonegap", !!window.cordova);

  // See: http://caniuse.com/#search=cross-origin
  has.add(
    "esri-cors", 

    // PhoneGap runtime supports cross domain XHR but controlled via its 
    // own config.xml
    // http://docs.phonegap.com/en/3.4.0/guide_appdev_whitelist_index.md.html#Whitelist%20Guide
    has("esri-phonegap") ||

    (
      window.XMLHttpRequest &&
      "withCredentials" in (new XMLHttpRequest())
    )
  );

  // See: 
  // http://www.html5rocks.com/en/tutorials/file/xhr2/
  // https://developer.mozilla.org/En/XMLHttpRequest/Using_XMLHttpRequest#Using_FormData_objects
  // https://developer.mozilla.org/en/DOM/XMLHttpRequest/FormData
  has.add("esri-file-upload", (window.FormData && window.FileList) ? true : false);

  // Add checks for html5 Worker
  has.add("esri-workers", window.Worker ? true : false);

  // TODO
  // See here for discussion related to feature detection:
  // http://hacks.mozilla.org/2011/10/css-3d-transformations-in-firefox-nightly/comment-page-1/#comment-991061
  // Android 2.x bug: http://code.google.com/p/android/issues/detail?id=12451
  // Dojo version sniffing bug in Opera: http://bugs.dojotoolkit.org/ticket/13159

  // Detecting transforms and transitions without sniffing user agent
  // could be clunky at this point.
  // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/css/transforms3d.js
  // Dojo 1.9.2: http://mail.dojotoolkit.org/pipermail/dojo-interest/2013-December/079827.html
  has.add("esri-transforms", stdIE || isIE >= 9 || isFF >= 3.5 ||
                          isChrome >= 4 || isSafari >= 3.1 || 
                          isOpera >= 10.5 || 
                          has("esri-iphone") >= 3.2 || has("esri-android") >= 2.1);

  has.add("esri-transitions", stdIE || isIE >= 10 || isFF >= 4 ||
                          isChrome >= 4 || isSafari >= 3.1 || 
                          isOpera >= 10.5 || 
                          has("esri-iphone") >= 3.2 || has("esri-android") >= 2.1);

  has.add("esri-transforms3d", stdIE || isFF >= 10 ||
                          isChrome >= 12 || isSafari >= 4 || 
                          has("esri-iphone") >= 3.2 || has("esri-android") >= 3);

  has.add("esri-url-encodes-apostrophe", function () {
    var a = window.document.createElement("a");
    a.href = "?'";
    return a.href.indexOf("?%27") > -1;
  });

  // ========== Internet Explorer Notes ==========
  // Looks like 3D Transform is only supported in IE 10 Developer Preview.
  // Not in Platform Preview. Developer Preview is available only with Windows 8.
  // Still 3D Transforms scale image in a peculiar manner such that images
  // appear watered down and wobble when scaling over multiple map levels

  // ========== Chrome Bug ==========
  // Technically Chrome supports 3D Transforms since version 12, but has the 
  // following problem identified in v15:
  // Overall there are 3 unique issues:
  // 1) Navigating from one feature to the next in the popup does not set proper 
  //    scrollbar height - unless you pan the map while the popup is open with 
  //    scrollbar leaking out. This issue is fixed by the txSuffix workaround
  //    described below in esri._css scope.
  // 2) On Windows, the scrollbar is invisible or very transparent so that users
  //    dont see them, But can be clicked or dragged
  // 3) Dragging the scrollbar or using mouse wheel does not scroll the popup
  //    content
  // Chrome at version 17 seems to have fixed issues #2 and #3 above.
  // Note: 15.0.874.121 m is the stable version at the time of this writing, and
  // 17.0.942.0 dev-m is the dev version.
  // Note: 15.0.874.121 m with 2D transform flickers when opening a new tab
  // and begin to zoom in.

  // ========== Android Bug ==========
  // Catch the case where Android Browser identifies itself as Safari as well
  // i.e. both isSafari and isAndroid will be true.
  // Android 2.x bug: http://code.google.com/p/android/issues/detail?id=12451
  if (has("esri-android") < 3) {
    has.add("esri-transforms", false, false, true);
    has.add("esri-transitions", false, false, true);
    has.add("esri-transforms3d", false, false, true);
  }

  esriNS._css = function(force3D) {
    var has3D = has("esri-transforms3d");

    // Override to force 3D
    if (force3D !== undefined && force3D !== null) {
      has3D = force3D;
    }
    // Override to disable 3D on some versions of Chrome and Safari on Desktop
    else if (has3D) {
      // Adelheid reported some issues in Safari:
      //   a duplicate focus highlight below find input box
      //   text leaking outside the textbox in "Share" dialog etc
      if (isChrome || (isSafari && !has("esri-iphone"))) {
          has3D = false;
      }
      // As of this writing, Chrome scrollbar bug is not fixed at "18.0.1010.0 canary"
      // Let's always do 2D in Chrome.
    }

    var txPrefix = has3D ? "translate3d(" : "translate(",
        txSuffix = has3D ? (isChrome ? ",-1px)" : ",0px)") : ")",
        scalePrefix = has3D ? "scale3d(" : "scale(",
        scaleSuffix = has3D ? ",1)" : ")",
        rotPrefix = has3D ? "rotate3d(0,0,1," : "rotate(",
        matrixPrefix = has3D ? "matrix3d(" : "matrix(",
        matrixC1 = has3D ? ",0,0," : ",",
        matrixC2 = has3D ? ",0,0,0,0,1,0," : ",",
        matrixSuffix = has3D ? ",0,1)" : ")";

    // Background info on txSuffix (scrollFix):
    // Workaround for a Chrome bug where children and grand-children of the  
    // parent of a 3d-translated element have messed-up scrollbars.
    //   3d-translated element = map layers
    //   parent = map container
    //   one of the children = Popup contentPane
    // Observed in Chrome 15.0.874.121 m (Win and Mac)
    // Test case: 
    // http://pponnusamy.esri.com:9090/jsapi/mapapps/testing/map/transforms/chrome-scrollbar-bug.html
    // Discussion:
    // http://stackoverflow.com/questions/6810174/z-index-on-position-fixed-in-webkit-nightly
    // https://bugs.webkit.org/show_bug.cgi?id=56917

    return {
      // Reference:
      // https://developer.mozilla.org/en/CSS/CSS_transitions
      // http://www.opera.com/docs/specs/presto25/css/transitions/#events
      names: {
        transition:    (isWebKit && "-webkit-transition") || (isFF && "MozTransition") || 
                       (isOpera && "OTransition") || (isIE && "msTransition") ||
                       "transition",

        transform:     (isWebKit && "-webkit-transform") || (isFF && "MozTransform") || 
                       (isOpera && "OTransform") || (isIE && "msTransform") ||
                       "transform",

        transformName: (isWebKit && "-webkit-transform") || (isFF && "-moz-transform") || 
                       (isOpera && "-o-transform") || (isIE && "-ms-transform") ||
                       "transform",

        origin:        (isWebKit && "-webkit-transform-origin") || (isFF && "MozTransformOrigin") || 
                       (isOpera && "OTransformOrigin") || (isIE && "msTransformOrigin") ||
                       "transformOrigin",

        endEvent:      (isWebKit && "webkitTransitionEnd") || (isFF && "transitionend") || 
                       (isOpera && "oTransitionEnd") || (isIE && "MSTransitionEnd") ||
                       "transitionend"
      },

      translate: function(x, y) {
        return txPrefix + x + "px," + y + "px" + txSuffix;
      },

      scale: function(factor) {
        return scalePrefix + factor + "," + factor + scaleSuffix;
      },

      rotate: function(angle) {
        return rotPrefix + angle + "deg)";
      },

      matrix: function(m) {
        // http://www.w3.org/TR/css3-3d-transforms/#transform-functions
        // http://www.useragentman.com/blog/2011/01/07/css3-matrix-transform-for-the-mathematically-challenged/
        // http://www.useragentman.com/matrix/
        // http://www.eleqtriq.com/2010/05/css-3d-matrix-transformations/
        // http://www.eleqtriq.com/2010/05/understanding-css-3d-transforms/
        // http://developer.apple.com/library/safari/#documentation/InternetWeb/Conceptual/SafariVisualEffectsProgGuide/Transforms/Transforms.html
        // http://9elements.com/html5demos/matrix3d/
        // Firefox does not accept unitless values for dx and dy: https://developer.mozilla.org/en/CSS/-moz-transform#matrix
        return matrixPrefix + m.xx + "," + m.xy + matrixC1 +  
               m.yx + "," + m.yy + matrixC2 + 
               m.dx.toFixed(10) + (isFF ? "px," : ",") + m.dy.toFixed(10) + (isFF ? "px" : "") +
               matrixSuffix;

        // Without toFixed above for dx and dy, transforms will silently fail if
        // the values contain "e" (exponent notation) in them

        /*return "matrix(" +
               m.xx + "," + m.xy + "," + m.yx + "," + m.yy + "," + m.dx + "," + m.dy +
               ")";*/
      },

      getScaleFromMatrix: function(m) {
        if (!m) {
          return 1;
        }
        m = m.toLowerCase();
        var prefix = m.indexOf("matrix3d") > -1 ? "matrix3d(" : "matrix(";
        // get the scale value out of a matrix 2d or 3d string.
        return Number(m.substring(prefix.length, m.indexOf(",")));
      }
    };
  };
  
  if (has("extend-esri")) {
    esriNS.isiPhone = has("esri-iphone");
    esriNS.isAndroid = has("esri-android");
    esriNS.isFennec = has("esri-fennec");
    esriNS.isBlackBerry = has("esri-blackberry");
    esriNS.isTouchEnabled = has("esri-touch");
    esriNS.isPointerEnabled = has("esri-pointer");
    esriNS._hasCors = has("esri-cors");
    esriNS._hasFileUpload = has("esri-file-upload");
    esriNS._hasTransforms = has("esri-transforms");
    esriNS._hasTransitions = has("esri-transitions");
    esriNS._has3DTransforms = has("esri-transforms3d");
  }
  
  return has;
});
