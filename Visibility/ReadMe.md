# visibility-widget

This widget provides the ability to quickly perform line of sight analyses.

![Image of Distance and Directions Widget][ss]

## Features

* Creates LLOS RLOS
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

In order to develop and test widgets you need to deploy the Visibility folder to the stemapp/widgets directory in your Web AppBuilder for ArcGIS installation. If you use Github for windows this can be accomplished using the following steps.

1. Sync the repository to your local machine.
2. Open the Repository in Windows Explorer
3. Close Github for Windows
4. Cut and paste the entire Visibility folder into the stemapp/widgets folder
5. Launch Github for Windows and choose the option to locate the repository. This will change the location on disk to the new location.


## <a name="workflows"></a> Workflows - LLOS

### <a name="one-to-one-linear-line-of-sight-llos"></a> One-to-one Linear Line Of Sight (LLOS) 
1. Add an elevation surface to the map. 
	* This may be a raster dataset, image service, or mosaic dataset.
2. Open the *Visibility Tools*
3. Select the **LLOS** tab
4. Select the **Input Surface** layer from the list
5. Use the **Observer Map Point Tool** to select an observer location on the map.
6. Use the **Target Map Point Tool** to select the target location on the map.
7. Optionally, type an **Observer Offset**, **Target Offset**, and select the offset units.
8. Select **OK**

### <a name="one-to-many-linear-line-of-sight-llos"></a> One-to-many Linear Line Of Sight (LLOS)
1. Add an elevation surface to the map. 
	* This may be a raster dataset, image service, or mosaic dataset.
2. Open the *Visibility Tools*
3. Select the **LLOS** tab
4. Select the **Input Surface** layer from the list
5. Use the **Observer Map Point Tool** to select an observer location on the map.
6. Use the **Target Map Point Tool** to select one or many target location on the map.
7. Optionally, type an **Observer Offset**, **Target Offset**, and select the offset units.
8. Select **OK**

### <a name="many-to-many-linear-line-of-sight-llos"></a> Many-to-many Linear Line Of Sight (LLOS) 
1. Add an elevation surface to the map. 
	* This may be a raster dataset, image service, or mosaic dataset.
2. Open the *Visibility Tools*
3. Select the **LLOS** tab
4. Select the **Input Surface** layer from the list
5. Use the **Observer Map Point Tool** to select one or many observer location on the map.
6. Use the **Target Map Point Tool** to select one or many target location on the map.
7. Optionally, type an **Observer Offset**, **Target Offset**, and select the offset units.
8. Select **OK**

### <a name="many-to-one-linear-line-of-sight-llos"></a> Many-to-one Linear Line Of Sight (LLOS) 
1. Add an elevation surface to the map. 
	* This may be a raster dataset, image service, or mosaic dataset.
2. Open the *Visibility Tools*
3. Select the **LLOS** tab
4. Select the **Input Surface** layer from the list
5. Use the **Observer Map Point Tool** to select many observer locations on the map.
6. Use the **Target Map Point Tool** to select one target location on the map.
7. Optionally, type an **Observer Offset**, **Target Offset**, and select the offset units.
8. Select **OK**

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
