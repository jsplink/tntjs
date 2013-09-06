tntjs
===
## A single-load web application framework.
"One code-base, all devices." Because hey, it's all the same web.

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
    	'viewName<numberID>': { // numberID optional
    		'typeName': {
    			offset: number,
    			limit: number,
    			filters: [
    				[
    					'propertyName', 
    					( '<' | '>' | '==' | '<=' | '>=' | '!=' ),
    					'propertyValue'
    				] ), [ ... ]
    			]
    		}
    	}
    });

**Step One** Within your View (views.js) define the list you wish to show.

    var groups = dataserve.serveList({
    	'groupChooser': { 
    		'group': { 
    			offset: 0,
    			limit: 25,
    			order: ["created", "ASC"],
    			filters: [
    				['category', '==', 'soccer]
    			]
    		}
    	}
    });
    
**Step Two** DataServe registers this data and queries the Comm module which in turn sends to your back-end.

    jsonp:jQuery19105425903734285384_1378496107370
    action:get_list
    arg0:{"config":{"group_chooser":{"group":{"offset":0,"limit":25,"order":["created","ASC"]}}}}
    arg1:undefined
    quuid:923e1329-8049-4674-84f0-5eefb54037cc
    time:1378496254498
    _:1378496107383
    
**Step Three** Your server shall respond with the following.

    {
        "body": {
            "status": 1, 
            "config": {
                "groupChooser": {
                    "group": [{
                        "name": "Soccer Group",
                        "groupID": 24
                    }, { ... }]
                }
            }, 
            "quuid": "923e1329-8049-4674-84f0-5eefb54037cc"
        }, 
        "timestamp": "2013-09-06T19:37:34.814917", 
        "signature": "NmY4MzY5MDE4NzU2ZDcxODA1OGE2MzUyNGZjNTYyNjdjYzRiMzgxNjAzN2NjMTk0Yjg1NjUzNjQ0\nYjhhYjgyMg=="
    }
    
**Step Four** The comm module (1) validates the hmac signature via comm.tokens, (2) updates the receivedMsg array

**Step Five** The dataserve is notified of the received message and updates the list in the registry.

**Step Six** Your view is automatically updated and thus the UI changes as expected.

## dataserve.serveObject
The serveObject method creates an expectation for an object. 

    dataserve.serveObject('***objectName***<numberID>*** }');

## Disclaimer
Having been gutted out of a project w/ lots of sloc less than a week ago, this is merely a beginning for tntjs: down-right simple and glad for it.

Please add issues instead of contributing. Chances are good I've already implemented a solution but haven't updated this repository.

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
