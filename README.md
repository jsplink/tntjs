TNT.js
===
## A single-load web application framework.
"One code-base, all devices." Mirroring the fact that it's all the same web.

"Use what works best." Adopting libraries with clean design.

"Freeze! Drop it, punk." Cleanliness means dropping everything we can.

## Project Modules
* app.js

    Exposes your forms & views. Also listens to the data registry and updates identify-based configurations (i.e. user changes). Views are auto-updated once bound to the registry.
* dataserve.js

    Listens to the Comm module and updates the registry per incoming object / list modifications.
* comm.js

    First-level dispatcher. Exposes a queue of incoming messages. Holds and process a queue of the outgoing. Talks to the user via ui.sysComm.
* nav.js

    Configuration-based navigation controller. Configuration defined in settings.js.
* views.js

    Provides a view object to extend.
* models.js

    Provides a model object to extend. Data-type enforcement, subscribable properties, prototypal inheritance.
* forms.js

    Provides a form object to extend. Namespace for defining models for user input.
* settings.js

    App-wide settings.
* util.js

    A place for those generally useful tools.
* ui.js

    Extra user-interface controllers (i.e. $(".adate") fromNow updates)

## Dependencies
* jquery.js

    API for the DOM
* underscore.js

    Utility methods for the JS
* bootstrap.js

    Standardization of UI components
* moment.js

    A time module which doesn't suck
* knockout.js

    Standardization of Data <> DOM interactions
* crypto.js

    For a (thin) layer of HMAC message signatures
* crossroads.js

    Keeping those routes flexible since 2011
* socket.io

    Group-based messaging
    
## dataserve.serveList
The serveList method creates an expectation for a list of named objects. Objects are identified with a viewName and a typeName, along with optional number identifiers.

These number identifiers allow you to call for object-specific data lists from your database.

    dataserve.serveList({
    	'***viewName***<***numberID***>': { // numberID optional
    		'***typeName***': {
    			offset: ***number***,
    			limit: ***number***,
    			filters: [
    				***[***
    					'***propertyName***<***numberID***>', 
    					'{ ***<*** | ***>*** | ***==*** | ***<=*** | ***>=*** | ***!=*** }',
    					'***propertyValue***'
    				***]*** ), [ ... ]
    			]
    		}
    	}
    });


    dataserve.serveList({
    	'groupChooser': { 
    		'group': { 
    			offset: 0,
    			limit: 25,
    			filters: [
    				['category', '==', 'soccer]
    			]
    		}
    	}
    });

## dataserve.serveObject
The serveObject method creates an expectation for an object. 

    dataserve.serveObject('***objectName***<numberID>*** }');

## Disclaimer
Having been gutted out of a project w/ lots of sloc less than a week ago, this is merely a conceptual (not a working) model of TNTjs: down-right simple and glad for it.

Some of these components have already been refactored / updated, updates which are not apart of my daily or weekly workflow as of right now. Expect tests and a how-to sometime in the near future.

## License
The MIT License (MIT)

Copyright (c) 2013 John Sphar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
