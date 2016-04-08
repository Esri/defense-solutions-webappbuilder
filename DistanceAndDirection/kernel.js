define(
[
  "dojo/_base/kernel",
  "dojo/_base/config",
  "dojo/has"
],
function(kernel, dojoConfig, has) {
  // Defines the "esri" object
  
  var location = window.location,
      pathname = location.pathname,
      
      esriNS = {
        //version
        version: "3.17",
        
        //application base url
        _appBaseUrl: location.protocol + "//" + 
                     location.host + 
                     pathname.substring(
                       0,
                       pathname.lastIndexOf(
                         pathname.split("/")[pathname.split("/").length - 1]
                       )
                     )
      };
  
  if (!dojoConfig.noGlobals) {
    window.esri = esriNS;
  }

  /**
   * This "has" feature indicates whether modules in our library should add
   * their "exports" to the "esri" object.
   * 
   * Build profiles will set this feature to 1 using hasCache in their default
   * configuration (see *.profile.js)
   * http://dojotoolkit.org/reference-guide/1.8/loader/amd.html#configuration-variables
   * 
   * It can be overridden by an application at runtime using dojoConfig:
   *   var dojoConfig = {
   *     has: {
   *       "extend-esri": 0
   *     }
   *   };
   * 
   * https://dojotoolkit.org/documentation/tutorials/1.8/build/
   * http://dojotoolkit.org/reference-guide/1.8/dojo/has.html 
   * http://bugs.dojotoolkit.org/ticket/13959
   */
  if (!kernel.isAsync) {
    has.add("extend-esri", 1);
  }
  
  // Used by BasemapGallery and Basemap
  var esriDijit = esriNS.dijit  = (esriNS.dijit || {});
  esriDijit._arcgisUrl = (location.protocol === "file:" ? "http:" : location.protocol) + "//www.arcgis.com/sharing/rest";
  
  return esriNS;
});
