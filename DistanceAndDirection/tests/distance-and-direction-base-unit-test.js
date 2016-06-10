define([
    'intern!object',
    'intern/chai!assert',
    'require',
    'dojo/dom-construct',
    'dojo/_base/window',
    'esri/map',
    'DD/models/FeedBack',
    'dijit/form/Button',
    'esri/symbols/CartographicLineSymbol',
    'esri/graphic',
    'esri/geometry/Point',
    'esri/Color'
], function(registerSuite, assert, require, domConstruct, win, Map, Feedback, Button, CartographicLineSymbol, Graphic, Point, Color) {
    // local vars scoped to this module
    var map, lineTab, mapPointButton, feedBack, lineSymbol;

    registerSuite({
        name: 'Distance-Direction-Base-Class-Widget',
        // before the suite starts
        setup: function() {
            // load claro and esri css, create a map div in the body, and create the map object and print widget for our tests
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/esri/css/esri.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/dijit/themes/claro/claro.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<script src="http://js.arcgis.com/3.16/"></script>', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<div id="map" style="width:800px;height:600px;" class="claro"></div>', win.body(), 'only');
            domConstruct.place('<div id="lineNode" style="width:300px;" class="claro"></div>', win.body(), 'last');
            domConstruct.place('<div id="buttonNode" style="width:300px;""></div>', win.body(), 'last');

            map = new Map("map", {
                basemap: "topo",
                center: [-122.45, 37.75],
                zoom: 13,
                sliderStyle: "small"
            });

            lineSymbol = new CartographicLineSymbol(
            	CartographicLineSymbol.STYLE_SOLID,
	          	new Color([255,0,0]), 10, 
	          	CartographicLineSymbol.CAP_ROUND,
	          	CartographicLineSymbol.JOIN_MITER, 5
	        );

            var dfd = this.async(1000);
            map.on("load", function() {
				feedBack = new Feedback(map);
				feedBack.on("draw-end", function(evt) {
					feedBack.deactivate();
					map.graphics.add(new Graphic(evt.geometry, lineSymbol));
				});	 
				dfd.resolve();
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
            if (lineTab) {
                lineTab.destroy();
            }
        },

        'Test Create Feedback Instance': function() {                        
            console.log('Start create feedback test');

            assert.ok(feedBack);
            assert.instanceOf(feedBack, Feedback, 'feedBack should be an instance of FeedBack');

            mapPointButton = new Button({
            	label: "Map Point",
            	onClick: function() {                		
            		feedBack.activate("Line");                		
            	}
            })

            console.log('End create feedback test');           
        },

        'Test Start and End Points': function () {
			if (feedBack) {
                console.log('Start lat/long points test');

                //Create start point LAT/LONG
                var startPt = new Point({
                    x: -122.65,
                    y: 45.53,
                    spatialReference: {
                      wkid: 4326
                    }
                }); 
                assert.ok(startPt);

                //Create end point LAT/LONG
                var endPt = new Point({
                    x: -120.65,
                    y: 45.53,
                    spatialReference: {
                      wkid: 4326
                    }
                });     
                assert.ok(endPt);

                feedBack.startPoint = startPt;
                assert.ok(feedBack.startPoint);

                feedBack.endPoint = endPt;
                assert.ok(feedBack.endPoint);

                console.log('End lat/long points test');
			}			
		}        		

		'Test Line Creation': function () {
            console.log('Line creation test');

            //Create start point LAT/LONG
            var startPt = new Point({
                x: -122.65,
                y: 45.53,
                spatialReference: {
                  wkid: 4326
                }
            }); 

            //Create end point LAT/LONG
            var endPt = new Point({
                x: -120.65,
                y: 45.53,
                spatialReference: {
                  wkid: 4326
                }
            });     

            feedBack.startPoint = startPt;
            feedBack.endPoint = endPt;

            //Center map on start point
            map.centerAt(startPt);

            //Get screen points from start and end LAT/LONG points
            var screenStartPt = map.toScreen(startPt);
            var screenEndPt = map.toScreen(endPt);

            /*
                Create a line using these steps

                1. Get the HTML page
                2. Wait 5 seconds for the HTML body to load
                3. Get the lineNode element - button
                4. Click on the button
                5. Move the mouse over map to start point in screen units
                6. Press the mouse button
                7. Drag to end point in screen units
                8. Release button
            */
            return this.remote
                .waitForElementByCssSelector('body.loaded', 5000)
                .elementById('lineNode')
                .clickElement()
                .moveMouseTo(map.domNode, screenStartPt.x, screenStartPt.y).sleep(500)
                .pressMouseButton(0).sleep(500)
                .moveMouseTo(map.domNode, screenEndPt.x, screenEndPt.y).sleep(500)
                .releaseMouseButton(0)
                .end();	        
		}
    });
});