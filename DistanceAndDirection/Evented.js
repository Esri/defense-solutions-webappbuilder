/********************
 * Module definition
 ********************/
define(
/***********************
 * List of dependencies
 ***********************/
[
  "dojo/_base/declare", // declare
  "dojo/_base/lang", // hitch
  "dojo/aspect",
  "dojo/Evented",
  "dojo/has",
  "./kernel"],
/********************
 * Callback function
 ********************/

function(declare, lang, aspect, Evented, has, esriNS) {

  // This class allows sub-classes to be event providers and helps them
  // emit events.
  var esriEvented = declare([Evented], {
    declaredClass: "esri.Evented",

    // Subclasses must register their legacy dojo.connect events
    // so that 
    //   dojo.connect(map, "onExtentChange", function(extent, delta, levelChange, lod) {});
    // can be evented as:
    //   map.on("extent-change", function(evt) {});
    // Note that multiple arguments have been normalized into an event object.
    // You don't __have__ to register:
    // 1. "organic" "on" events (native & simulated)
    // 2. events which already use an event object
    // 3. events which don't send any event arguments
    // 
    // However, you __should__ register them with a value of 'true'
    // otherwise an event listener registered via 'on' method but triggered
    // by a call to 'onEventName' function that doesn't actually exist will
    // never call the event listener. 

    registerConnectEvents: function() {
      // this._eventMap is a dictionary:
      // {
      //   "<on-event-name>": [ "<event-property-1>", "<event-property-2>", ... ],
      //   ...
      // }
      // Example:
      // {
      //   "extent-change": [ "extent", "delta", "levelChange", "lod" ]
      // }

      /*
      We only need to do this once per class. After the first call on the first
      instance of this class, we can skip this method.
      */
      var ctor = this.constructor,
        parents = this.constructor._meta.parents,
        onmaps = [{}],
        eventDict = {},
        evtMap, attr, evtType, onEvtType, k,
        collectEvents = function(parents, maps) {
          if (!lang.isArray(parents)) {
            parents = [parents];
          }
          for (var i = 0; i < parents.length; i++) {
            var p = parents[i];
            if (p._meta && p._meta.parents) {
              collectEvents(p._meta.parents, maps);
            }
            if (p.prototype._eventMap) {
              maps.push(lang.mixin({}, p.prototype._eventMap));
            }
          }
          return maps;
        };

      if (!ctor._onMap) {
        /* get all the inherited classes event maps */
        collectEvents(parents, onmaps);
        onmaps.push(this._eventMap);
        /* combine all the event maps into one */
        evtMap = lang.mixin.apply(this, onmaps);

        /*inspect class and register connect mappings for any onEvtName
          function in prototype or instance.
          */
        for (attr in this) {
          if (/^on\w/.test(attr) && lang.isFunction(this[attr])) {
            evtType = this._hyphenLower(attr).toLowerCase();
            //only add introspected methods we don't have a mapping for
            if (!evtMap[evtType]) {
              eventDict[evtType] = {
                "method": attr
              };
            }
          }
        }
        //add our combined event mappings
        for (k in evtMap) {
          onEvtType = this._onCamelCase(k);
          eventDict[k] = {
            "method": onEvtType,
            "argKeys": evtMap[k]
          };
        }
        ctor._onMap = eventDict;
        return ctor._onMap;
      }
    },

    // Override dojo.Evented::on method       
    on: function(type, listener) {
      if (type.indexOf(",") > -1) {
        var types = type.split(/\s*,\s*/),
            len = types.length,
            handles = [];
        while (len--) {
          handles.push(this.on(types[len], listener));
        }
        handles.remove = function() {
          for (var i = 0; i < handles.length; i++) {
            handles[i].remove();
          }
        };
        return handles;
      }
      var onMap = this.constructor._onMap || this.registerConnectEvents(),
          ltype = (typeof type == "string") && type.toLowerCase(),
          ontype = this._onCamelCase(ltype),
          mapped = onMap && onMap[ltype],
          legacyMethod = (mapped && mapped.method) || (this[ontype] && lang.isFunction(this[ontype]) && ontype),
          fixArgs;

      if (legacyMethod) {
        //legacy method exists and is likely to be called with positional arguments
        if (mapped && lang.isArray(mapped.argKeys)) {
          fixArgs = this._onArr2Obj(listener, onMap[ltype].argKeys);
          //Attach the listener to fire after the onEvent func and receive an event obj
          //if the onEvent func is not called & only emit is used, emit will call the 
          //onEvent func for us.
          return aspect.after(this, legacyMethod, fixArgs, true);
        }
        else {
          return aspect.after(this, legacyMethod, function(eventObj) {
            eventObj = eventObj || {};
            if (!eventObj.target) {
              eventObj.target = this;
            }
            listener.call(this, eventObj);
          }, true);
        }
      }
      // if we didn't return due to a modified onEvent method above, then we just
      // hook up the type & listener as expected.
      return this.inherited(arguments);
    },

    //Override dojo.Evented::emit method
    emit: function(type, eventObj) {
      var ret, evtArgs, legacyMethod, callback, callbackArgs,
      ltype = type.toLowerCase(),
        onType = this._onCamelCase(type),
        onMap = this.constructor._onMap || this.registerConnectEvents();

      legacyMethod = (onMap && onMap[ltype] && onMap[ltype].method) || (lang.isFunction(this[onType]) && onType);
      callback = legacyMethod && this[legacyMethod];

      //convert the eventObj to a positional array if needed
      //and we have an object to array mapping defined
      if (legacyMethod && onMap && onMap[ltype]) {
        this._onObj2Arr(function() {
          evtArgs = Array.prototype.slice.call(arguments);
        }, onMap[ltype].argKeys)(eventObj);
      }

      eventObj = eventObj || {};
      if (!eventObj.target) {
        eventObj.target = this;
      }

      if (callback) {
        callbackArgs = (evtArgs && evtArgs.length) ? evtArgs : [eventObj];
        //something is might be depending on the callback method firing
        ret = callback.apply(this, callbackArgs);
      }
      //call emit as normal now that the legacy method was called if needed
      this.inherited(arguments, [type, eventObj]);

      return ret;
    },

    _onObj2Arr: function(listener, argKeys) {
      if (!argKeys) {
        return listener;
      } else {
        var self = this;
        return function(evt) {
          var i, args = [],
            numArgs = argKeys.length;
          for (i = 0; i < numArgs; i++) {
            args[i] = evt[argKeys[i]];
          }
          listener.apply(self, args);
        };
      }
    },

    _onArr2Obj: function(listener, argKeys) {
      if (!argKeys) {
        return listener;
      } else {
        var self = this;
        return function() {
          var i, evt = {}, numArgs = arguments.length;
          for (i = 0; i < numArgs; i++) {
            evt[argKeys[i]] = arguments[i];
          }
          if (!evt.target) {
            evt.target = self;
          }
          listener.call(self, evt);
        };
      }
    },

    _hyphenLower: function(type) {
      return type.replace(/^on/, "").replace(/[A-Z](?=[a-z])/g, function(m, off) {
        return (off ? "-" : "") + m.toLowerCase();
      });
    },

    _onCamelCase: function(type) {
      return "on" + type.substr(0, 1).toUpperCase() + type.substr(1).replace(/\-([a-z])/g, function(m, s) {
        return s.toUpperCase();
      });
    }
  });

  if (has("extend-esri")) {
    esriNS.Evented = esriEvented;
  }

  return esriEvented;
});
