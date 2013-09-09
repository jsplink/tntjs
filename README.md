tntjs
===

### A single page load web application framework.

`build status: failing`, mostly because there is no `build` yet. This is rather a modular structure for your client-facing projects.

(N) this non-tested example project will hopefully take you less than 10 minutes to understand via code browsing.

## Project Modules
* **app**.js - Exposes your **views** to your DOM (i.e. `data-bind="with: app.views"`). Also listens to the data registry and updates identify-based configurations (i.e. user or group changes). Views are auto-updated once bound to the registry.
* **dataserve**.js - Listens to the **comm** module and updates the registry per incoming object / list modifications. Queries the **models** module to instantiate objects. 
* **comm**.js - Dispatches incoming and outgoing messages. Exposes a queue of incoming messages. Holds and process a queue of the outgoing. Talks to the user via **ui**.sysComm.
* **nav**.js - Configuration-based navigation controller. Navbar configuration found in **settings**.
* **views**.js - Provides a view object to extend. Returns all of your **views** (including **forms**)
* **models**.js - Provides a model object to extend. Data-type enforcement, subscribable properties, prototypal inheritance.
* **forms**.js - Provides a form object to extend (submission handling, cancelation handling, validation, etc). This is where you define your user's input.
* **settings**.js - App-wide settings.
* **util**.js - A place for those generally useful tools & where we implement Subclassing.
* **ui**.js - Extra user-interface controllers (i.e. $(".adate") fromNow updates)

## Dependencies (included under the lib directory)
* jquery.js - API for the DOM
* underscore.js - Standardization of data algorithms
* bootstrap.js -  (3.0.x) Standardization of UI components
* knockout.js - Standardization of Data <> DOM interactions
* crypto.js - Message sender verification via HMAC message signatures
* crossroads.js family - Keeping those routes flexible since 2011 (signals,hasher,crossroads)
* socket.io - For spinning up node clients (group-based communication)
* moment.js - A time module (T) deprecate this dependency

## models.js
Used by the **dataserve** module to validate & instantiate information passed in via the **comm** module.

### Ob
Short for 'Object', this is the base class for all model definition.

    /**
    * @class <modelNameHere>
    * @desc <modelDescriptionHere>
    * @todo convert property declarations into an argument object
    */
    var <modelName> = Ob.makeSubclass({
    	_init: function(args) {
    		var self = this;
    		self._class = '<modelName>';
    		self._pkey = '<identifyingPropertyName>';
    		Ob.prototype._init(self, args, [
    			[
    			    < "Number" | "String" | "moment" | "epoch" | "Date" | "Array" >, 
    			    "<propertyValue>", 
    			    <requiredBoolean>
    			], [ ... ]
    		]);
    	}
    });
    
Perhaps, an example...

    /**
    * @class group
    * @desc Used for the CurrentGroup property
    */
    var group = Ob.makeSubclass({
    	_init: function(args) {
    		var self = this;
    		self._class = 'group';
    		self._pkey = 'groupId';
    		Ob.prototype._init(self, args, [
    			["Number", "groupId", false],
    			["String", "groupToken", true],
    			["String", "groupStyleType", true],
    		]);
    	}
    })
    
These **models** define what your server's client-bound data should look like. Server-side code is beyond the scope of this project.

## dataserve.js
Connects your **comm** to your **views**. Initiates objects via **models**. Serves lists and serves objects.

It is absolutely critical for everyone to ***implement inbound dataquery whitelisting*** for any request hitting the database in a dynamic-ish fashion, unless of course you want malicious activity on your system... for... perhaps, research? Hey, that's a pretty good idea!

### dataserve.serveList
The serveList method creates an expectation for a list of named objects. Objects are identified with a viewName and a typeName (i.e. data type name, created within **models**), along with number identifiers if there are any.

These number identifiers allow you to call for object-specific data lists from your database.

    dataserve.serveList({
    	'<viewName> { <NumberID> { <viewName> { <NumberID> ... } } }': { // keep adding <viewName><numberID> as the list becomes more and more detailed.
    		'<typeName>': {
    			offset: <number>,
    			limit: <number>,
    			filters: [
    				[
    					'<propertyName>', 
    					< '<' | '>' | '==' | '<=' | '>=' | '!=' >,
    					'<propertyValue>'
    				] ), [ ... ]
    			]
    		}
    	}
    });

**Step One** Within your **views** make calls to the **dataserve** as you wish.

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
    var golfGroup = dataserve.serveList({
        'groupChooserGroup48': {
            'member': {
                offset: 0,
                limit: 25,
                order: ["joined", "ASC"],
                filters: [[]]
            }
        }
    });
    var briansInterests = dataserve.serveList({
        'groupChooserGroup48member10': {
            'interest': {
                offset: 0,
                limit: 25,
                order: ["added", "ASC"],
                filters: [[]]
            }
        }
    });
    
When the server responds, the **dataserve** will look to **models** for the following definitions:

`groupChooserGroup`, `groupChooserGroupMember`, `groupChooserGroupMemberInterest`

If they do not exist in **models**, an error is thrown.

    
**Step Two** **dataserve** registers this data and queries the **comm** module which in turn sends to your back-end. (N) Note that there are outbound variable conversions going on here via (hence the non-camelCase).

    jsonp:jQuery19105425903734285384_1378496107370
    action:get_list
    arg0:{"config":{"group_chooser":{"group":{"offset":0,"limit":25,"order":["created","ASC"]}}}}
    arg1:undefined
    quuid:923e1329-8049-4674-84f0-5eefb54037cc
    time:1378496254498
    _:1378496107383
    
**Step Three** Your server shall respond with the following (use whatever back-end you prefer)..

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
    
**Step Four** The **comm** module (1) validates the hmac signature via **comm**.tokens and (2) updates the **comm**.receivedMsg array

**Step Five** The **dataserve**, listening to **comm** becomes notified of the received message and updates the list in the registry.

**Step Six** Your **views** are automatically updated and the user's interface follows (thanks to data-binding).

### dataserve.serveObject
The serveObject method creates an expectation for an object. 

    dataserve.serveObject('<objectName><numberID>');
    
## nav.js
Looks at **settings**.navigation and implements twitter's bootstrap. Also determines navigational hierarchy with the classes `.navigable-[a-z]`, where each latter letter shall be a child of its parent. In other words, `.navigable-[a-z]` designates the navigational hierarchy.

### navigable elements

Okay, so let's say you had a div called `#food` and a child called `#cheese`.

    <nav id='main-navigation'>
        <a href='#/cheese'>Cheese</a>
        <a href='#/cream'>Cream</a>
    </nav>
    <div id='food' class='navigable-a'>
        <div id='cheese' class='navigable-b'>
            <ul data-bind='foreach: milkProducts.cheese'></ul>
        </div>
        <div id='cream' class='navigable-b'>
            <ul data-bind='foreach: milkProducts.cream'></ul>
        </div>
    </div>
    
When the `#/cheese` link is clicked, all siblings of `#cheese` with the same `.navigable-b` class are hidden, and all `.navigable-[a-z]` ancestors / parents of `#/cream`--in this case `#food.navigable-a`--are shown.

Also note that the first decendant navigable is shown upon parent navigation. This means that when `#/food` is parsed by hasher, `#cheese` is shown and `#cream` is not.

Also note that `#/food/cheese` is seen in **settings**.navigation as `#food-cheese`. The slashes are changed to dashes and the initial slash is removed. This shall be smoothed out shortly.

## Credits

* Madhadron (@madhadron)
* JQuery (@jquery) 
* Underscore (@jashkenas)
* Twitter Bootstrap (@twbs)
* Moment.js (@moment)
* KnockoutJS (@knockout) (@SteveSanderson) (@mbest)
* CryptoJS
* Hasher/Signals/Crossroads family (@millermedeiros)
* Socket.io (@LearnBoost)

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
