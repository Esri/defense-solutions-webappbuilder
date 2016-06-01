Distance and Direction Widget: Unit testing
===========================================

The Distance and Direction Widget uses [Intern](http://theintern.io/) as its test runner.  Unit tests can be
executed directly from a browser.  To run functional tests, you will have to use either a hosted environment such as
[Sauce Labs](https://saucelabs.com/).

## Instructions

### Getting Intern

Install the latest version of Intern 2.x using npm at the web folder level.

```
npm install intern
```

The following sections assume tests and node_modules (intern) folders all exist within the same parent
folder(web).

### Running the units tests

#### From a browser

1. Deploy the DistanceAndDirection and intern components to a web server.
2. Open a browser to http://hostname/path-to-distance-and-direction-folder/node_modules/intern/client.html?config=tests/intern
3. View the results in the browser console window.  Note, some tests intentionally raise exceptions so you may find it
useful to disable any pause on exception features within your developer tools.

#### Through a hosted unit test environment

The included intern configuration is not setup to use in a hosted environment.  To use a hosted environment such as
Sauce Labs see the [Configuring Intern](https://github.com/theintern/intern/wiki/Configuring-Intern) wiki page.

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our
[guidelines for contributing](https://github.com/esri/contributing).

All web components produced follow [Esri's tailcoat](http://arcgis.github.io/tailcoat/styleguides/css/) style guide.

If you are using [JS Hint](http://http://www.jshint.com/) there is a .jshintrc file included in the root folder which
enforces this style.

## Licensing

Copyright 2014 Esri

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at
[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.