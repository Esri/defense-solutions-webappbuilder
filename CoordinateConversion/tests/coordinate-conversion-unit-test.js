define([
    'intern!object',
    'intern/chai!assert',
    'dojo/dom-construct',
    'dojo/_base/window',
    'esri/map',
    'CC/Widget',
    'dojo/_base/lang',
    'jimu/dijit/CheckBox',
    'jimu/BaseWidget',
    'jimu/dijit/Message',
    'dijit/form/Select',
    'dijit/form/TextBox'
], function(registerSuite, assert, domConstruct, win, Map, CoordinateConversion, lang) {
    // local vars scoped to this module
    var map, coordinateConversion;

    registerSuite({
        name: 'CoordinateConversion Widget',
        // before the suite starts
        setup: function() {
            // load claro and esri css, create a map div in the body, and create the map object and print widget for our tests
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/esri/css/esri.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/dijit/themes/claro/claro.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<script src="http://js.arcgis.com/3.16/"></script>', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<div id="map" style="width:300px;height:200px;" class="claro"></div>', win.body(), 'only');
            domConstruct.place('<div id="ccNode" style="width:300px;" class="claro"></div>', win.body(), 'last');

            map = new Map("map", {
                basemap: "topo",
                center: [-122.45, 37.75],
                zoom: 13,
                sliderStyle: "small"
            });
        },

        // before each test executes
        beforeEach: function() {
            // do nothing
        },

        // after the suite is done (all tests)
        teardown: function() {
            if (map.loaded) {
                map.destroy();    
            }
            if (coordinateConversion) {
                coordinateConversion.destroy();
            }            
        },

        'Test Coordinate Conversion CTOR': function() {
            if (map) {
                map.on("load", function () {
                    console.log('Start CTOR test');
                    coordinateConversion = new CoordinateConversion({
                        parentWidget: this,
                        map: map,
                        input: true,
                        type: 'DD',
                        config: {
                            coordinateconversion: {
                                zoomScale: 50000,
                                initialCoords: ["DDM", "DMS", "MGRS", "UTM"],
                                geometryService: {
                                    url: "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/Geometry/GeometryServer"
                                }
                            }   
                        }                
                    }, domConstruct.create("div")).placeAt("ccNode");    
                    coordinateConversion.startup();
                    assert.ok(coordinateConversion);
                    assert.instanceOf(coordinateConversion, CoordinateConversion, 'coordinateConversion should be an instance of CoordinateConversion');            
                    console.log('End CTOR test');
                });
            }
        }
    });
});