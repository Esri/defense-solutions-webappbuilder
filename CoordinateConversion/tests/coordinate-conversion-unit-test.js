define([
    'intern!object',
    'intern/chai!assert',
    'dojo/dom-construct',
    'dojo/_base/window',
    'esri/map',
    '../Widget'
], function(registerSuite, assert, domConstruct, win, Map, CoordinateConversion) {
    // local vars scoped to this module
    var map, coordinateConversion;

    registerSuite({
        name: 'CoordinateConversion Widget',
        // before the suite starts
        setup: function() {
            // load claro & esri css, create a map div in the body, and create the map object and print widget for our tests
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/js/dojo/dijit/themes/claro/claro.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/js/esri/css/esri.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<div id="map" style="width:300px;height:200px;" class="claro"></div>', win.body(), 'only');
            domConstruct.place('<div id="print" style="width:300px;" class="claro"></div>', win.body(), 'last');

            map = new Map("map", {
                basemap: "topo",
                center: [-122.45, 37.75],
                zoom: 13,
                sliderStyle: "small"
            });

             = new CoordinateConversion({
                parentWidget: this,
                input: true,
                type: 'DD'
            });    
            coordinateConversion.startup();

        },

        // before each test executes
        beforeEach: function() {
            // do nothing
        },

        // after the suite is done (all tests)
        teardown: function() {
            map.destroy();
            coordinateConversion.destroy();
        },

        // the tests, each function is a test
        'Test Coordinate Conversion': function() {
            // let the test output console reporter know we are waiting for stuff to load
            console.log('Start coordinate conversion test');

            // make this test async by calling this.async() and getting a handle to the deferred, prints take longer so set timeout to 10 sec.
            var dfd = this.async(10000);

            // define callback for map on load with our tests
            var ready = function( /*evt*/ ) {
                // call the print method which returns a defered, then wrap this tests defered around our tests.
                printWidget.print().fileHandle.then(function(data) {
                    var re = /^http/i;
                    if (data.url) {
                        console.log('data.url: ', data.url);
                    }
                    // this example shows how to use the dfd object directly rather than using dfd.callback()
                    try {
                        assert.strictEqual(re.test(data.url), true, 'data.url points to the result file, make sure it starts with http.');
                        dfd.resolve();
                    } catch (e) {
                        dfd.reject(e);
                    }
                });
            };
        }
    });
});