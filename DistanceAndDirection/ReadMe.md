# geodesy-and-range-widget

This widget provides the ability to create geodesic features such as lines, circles, ellipses and range rings.

![Image of Distance and Directions Widget][ss]

## Features

* Creates geodesic lines, circles, ellipses and range rings.
* Inputs can be entered manually or via a known coordinate
* Widget for [Web AppBuilder for ArcGIS](http://doc.arcgis.com/en/web-appbuilder/)

## Sections

* [Requirements](#requirements)
* [Instructions](#instructions)
* [Workflows](#workflows)
* [Resources](#resources)
* [Issues](#issues)
* [Contributing](#contributing)
* [Licensing](#licensing)

## Requirements

* Web Appbuilder Version 1.3 December 2015
* [ArcGIS Web Appbuilder for ArcGIS](http://developers.arcgis.com/web-appbuilder/)

## Instructions
Deploying Widget

Setting Up Repository for Development

In order to develop and test widgets you need to deploy the GeodesyAndRange folder to the stemapp/widgets directory in your Web AppBuilder for ArcGIS installation. If you use Github for windows this can be accomplished using the following steps.

1. Sync the repository to your local machine.
2. Open the Repository in Windows Explorer
3. Close Github for Windows
4. Cut and paste the entire GeodesyAndRange folder into the stemapp/widgets folder
5. Launch Github for Windows and choose the option to locate the repository. This will change the location on disk to the new location.


## Workflows

### Create Lines Interactively
	* Choose the Lines tab on the Distance and Directions Tool
	* Choose the type of line that is needed to be created
	* Start an interactive session by selecting the arrow icon
	* Enter a starting and ending point on the map by clicking on the map
	* Repeat until all desired graphics have been included

### Create Lines from Known Coordinates
	* Choose the type of line that is needed to be created
	* Input the first coordinate of where your line is going to start
	* Input the second coordinate of where your line is going to end
	* Press "Enter" key and the graphic will be drawn on the map
	* Repeat until all desired graphics have been included.

### Create a Line with a Range and Bearing
	* Choose the type of line that you would like to create
	* Choose Bearing and Distance from the second drop down menu
	* Input the length of the line and choose the unit type
	* Input the azimuth or angle of the line
	* Press "Enter" key and the graphic will be drawn on the map

### Create a Circle Interactively
	* Choose the Circle tab on the Distance and Direction Widget
	* Choose the type of circle you will create from in the ‘Create Circle From’ drop down list.
	* Start an interactive session by selecting the ‘Map Point’ icon 
	* Click on the map to create a starting (center) point. Drag the tool to create a radius for the circle.  
	* A graphic will then be displayed on the map showing the circle you created
      Note: The ‘Center Point’ and ‘Radius/Diameter’ will update based on parameters from newly created circle.
	* If desired you can clear all graphics with the clear graphics button


### Create Ellipses Interactively
	* Choose the Ellipse tab on the Distance and Directions Tool
	* Start an interactive session by selecting the arrow icon next to the “Center Point” text box
	* Choose the location where you want the ellipse to be started from
	* Drag the cursor to the location where the major axis will end
	* Select the orientation angle of the major axis
	* select the length of the minor axis
	* Graphic(s) will then be displayed on the map showing the Ellipse you created based on the values of the parameters that were set

### Create Range Rings Interactively
	* Choose the Range Rings tab on the Distance and Directions Tool
	* Start an interactive session by selecting the arrow icon next to the “Center Point” text box
	* Choose the location of the Range Rings center by selecting the desired location on the map
	* Fill in the associated parameters for “Number of Rings”, “Ring Interval”, “Distance Units”, and “Number of Radials”
	* Press "Enter" key
	* Graphic(s) will then be displayed on the map showing the Range Rings you created based on the values of the parameters that were set

### Create Range Rings Manually
	* Choose the Range Rings tab on the Distance and Directions Tool
	* Fill in the associated parameters for “Number of Rings”, “Ring Interval”, “Distance Units”, and “Number of Radials”
	* Input the coordinates for the Range Rings center in the “Center Point” text box and select the Enter key on the keyboard
	* Graphic(s) will then be displayed on the map showing the Range Rings you created based on the values of the parameters that were set
	* If desired you can clear all graphics with the clear graphics button

## General Help

  * [New to Github? Get started here.](http://htmlpreview.github.com/?https://github.com/Esri/esri.github.com/blob/master/help/esri-getting-to-know-github.html)

## Resources

  * [Web AppBuilder API](https://developers.arcgis.com/web-appbuilder/api-reference/css-framework.htm)
  * [ArcGIS API for JavaScript](https://developers.arcgis.com/javascript/)
  * [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
  * [ArcGIS Solutions Website](http://solutions.arcgis.com/military/)

  ![Twitter](https://g.twimg.com/twitter-bird-16x16.png)[@EsriDefense](http://twitter.com/EsriDefense)

## Issues

  Find a bug or want to request a new feature?  Please let us know by submitting an [issue](https://github.com/Esri/solutions-webappbuilder-widgets/issues).

## Contributing

  Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

  If you are using [JS Hint](http://www.jshint.com/) there is a .jshintrc file included in the root folder which enforces this style.
  We allow for 120 characters per line instead of the highly restrictive 80.

## Licensing

  Copyright 2016 Esri

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  A copy of the license is available in the repository's [license.txt](license.txt) file.

  [ss]: images/screenshot.png
  [](Esri Tags: Military Analyst Defense ArcGIS Widget Web AppBuilder ArcGISSolutions)
  [](Esri Language: Javascript)