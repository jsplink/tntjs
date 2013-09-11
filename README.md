tntjs
===

Simple, single-page scaffolding for developing cross-device web applications. By combining the flexibility of JavaScript with the power of rapidly evolving web standards we can greatly reduce the cost of software product development.

`build status: failing` (eta this weekend)

## Project Modules
* **tnt**.js - Exposes your **views** to your DOM (i.e. `data-bind="with: tnt.views"`). Also listens to the data registry and updates identity-based configurations (i.e. user or group changes). Views are auto-updated once bound to the registry.
* **dataserve**.js - Listens to the **comm** module and updates the registry per incoming object / list modifications. Queries the **models** module to instantiate objects.
* **comm**.js - Dispatches incoming and outgoing messages. Exposes a queue of incoming messages. Holds and one-by-one processes a queue of outgoing messages. Talks to the user via **ui**.sysComm.
* **nav**.js - Configuration-based navigation controller. Navbar configuration found in **settings**.
* **views**.js - Provides a view object to extend. Returns all of your **views** (including **forms**)
* **models**.js - Provides a model object to extend. Data-type enforcement, subscribable properties, prototypal inheritance.
* **forms**.js - Provides a form object to extend (submission handling, cancelation handling, validation, etc). This is where you define your user's input.
* **settings**.js - App-wide settings.
* **util**.js - A place for those generally useful tools & where we implement Subclassing.
* **ui**.js - Extra user-interface controllers (i.e. $(".adate") fromNow updates)

You should only need to edit **settings**, **models** (what will your server send?), **views** (what will your users see?), and **forms** (what will your users tell?).

## Dependencies

The npm registry has not upgraded a couple of the packages (cryptojs 3+, twitter-bootstrap 3.0), so `npm install` won't work. Please use the `/lib` directory or your own forks of those projects.

* jquery.js - API for the DOM
* underscore.js - Standardization of data algorithms
* bootstrap.js -  (3.0.x) Standardization of UI components
* knockout.js - Standardization of Data <> DOM interactions
* crypto.js - Message sender verification via HMAC message signatures
* crossroads.js family - Keeping those routes flexible since 2011 (signals,hasher,crossroads)
* socket.io - For spinning up node clients (group-based communication)
* moment.js - A time module (T) deprecate this dependency

This project will in time adopt Apache Cordova.

# How-To

## models.js `require("models");`
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

## dataserve.js `require("dataserve");`
Connects your **comm** to your **views**. Initiates objects via **models**. Serves lists and serves objects.

Please be sure to implement inbound dataquery whitelisting (see the owasp article on SQL Injection: https://www.owasp.org/index.php/SQL_Injection_Prevention_Cheat_Sheet).

### `dataserve.serveList({...});`
The serveList method creates an expectation (or, perhaps, a 'promise') for a list of named objects. Objects are identified with a viewName and a typeName (i.e. data type name, created within **models**), along with number identifiers if there are any.

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

### `dataserve.serveObject(...);`
The serveObject method creates an expectation for an object. 

    dataserve.serveObject('<objectName><numberID>');
    
## nav.js `require("nav");`
Looks at **settings**.navigation and implements twitter's bootstrap. Also determines navigational hierarchy with the classes `.navigable-[a-z]`, where each latter letter shall be a child of its parent. In other words, `.navigable-[a-z]` designates the navigational hierarchy.


### User Navigation

Okay, so let's say you had a div called `chat-room` and two children: `chat-room-settings` and `chat-room-messages`.
    
    <div id='chat-room' class='navigable-a'>
        <div id='chat-room-messages' class='navigable-b'>
            <ul data-bind='foreach: milkProducts.cream'></ul>
        </div>
        <div id='chat-room-settings' class='navigable-b'>
            <ul data-bind='foreach: milkProducts.cheese'></ul>
        </div>
    </div>

Please note that the placement of `chat-room-messages` as a div in front of `chat-room-settings` is important. When the URI `#/chat-room` is followed, the nav module loads the first navigable descendents of their class (in this case `#chat-room-messages.navigable-b`), and will hide from view `#chat-room-settings` until a `#/chat-room/settings` link is clicked upon.

The same goes for a-class navigable elements. Let's consider the following.

    <div id='chat-room' class='navigable-a'>
        <div id='chat-room-messages' class='navigable-b'>
            <ul data-bind='foreach: milkProducts.cream'></ul>
        </div>
        <div id='chat-room-settings' class='navigable-b'>
            <ul data-bind='foreach: milkProducts.cheese'></ul>
        </div>
    </div>
    <div id="settings" class='navigable-a'>
        <!-- ... -->
    </div>
    <div id='overview' class='navigable-a'>
        <!-- ... -->
    </div>

Here, when the user navigates to the `#/overview` URI the `#chat-room.navigable-a` and `#settings.navigable-a` elements will be hidden from view and the `#overview.navigable-a` element will be shown.

### Navigation Bar

There are two parts to defining and presenting user navigation.

1. Go into the **settings** module to declare the structure of your application.
2. Insert the associative HTML into your app html file (or just use the app.html which comes with this repo).

#### Step 1 - go to `settings.navigation;`

The twitter-bootstrap navigational bar configuration found in the **settings** module easily defines for you what your users will see at the top of their screen for navigation.

    /**
    * Description of this navbar.
    */
    <userTypeA>: { // name of your navbar, most likely the type of user (i.e. guest, etc.)
        root: '<mainViewName>',
        children: [
            '<userViewNameA>', // these viewNames always activate the <userTypeA> navbar
            '<userViewNameN>'
        ], 
        navbar: [
            {
                name: '<viewNameATitle>', // name on the button
                link: '<viewNameAURI>',
                pos: '<left | right>'
            }, {
                name: '<viewNameNTitle>',
                menu: [
                    { // example of a drop-down menu
                        name: '<viewNameAChildViewName>',
                        link: '<viewNameAChildViewNameURI>'
                    }, { ... }
                ],
                pos: '<left | right>'
            }
        ]
    }, 
    /**
    * Description of this navbar.
    */
    <userTypeN>: { 
        ... 
    }
        
Perhaps, an example.

    /**
    * Navigational settings for the application.
    */
    navigation: {
        /**
        * As seen by first-time users.
        */
        guest: {
            root: 'welcome',
            children: [
                'welcome',
                'sign-in',
                'sign-up', 
                'forgot-password',
                'reset-password' 
            ], 
            navbar: [
                {
                    name: 'Welcome',
                    link: '#/welcome',
                    pos: 'left'
                }, {
                    name: 'Sign Up',
                    link: '#/sign-up',
                    pos: 'right'
                }, { 
                    name: 'Sign In',
                    link: '#/sign-in',
                    pos: 'right'
                }
            ]
        },
        /**
        * As seen by users.
        */
        user: {
            root: 'entryway',
            children: [ 
                'entryway', 
                'entryway-groups', 
                'entryway-group-invites', 
                'group-form',
                'join-home'
            ], 
            navbar: [
                {
                    name: 'Entryway',
                    link: '#/entryway',
                    pos: 'left'
                }, { 
                    name: 'Create a Group',
                    link: '#/group-form',
                    pos: 'left'
                }, { 
                    name: 'Join a Group',
                    link: '#/join-group',
                    pos: 'left'
                }
            ]
        }, 
        /**
        * As seen by members. 
        */
        member: {
            root: 'overview',
            children: [
                'overview', 
                'chat-room',
                'people',
                'move-out',
                'invite-member'
            ], 
            navbar: [
                {
                    name: 'Overview', 
                    link: '#/overview'
                }, {
                    name: 'Discuss', 
                    menu: [
                        { 
                            name: 'Message Thread',
                            link: '#/chat-room' 
                        }
                    ]
                }, { 
                    name: 'Manage', 
                    menu: [
                        {
                            name: 'Invite Member',
                            link: '#/invite-member'
                        }, { 
                            name: 'Group Settings', 
                            link: '#/change-nickname' 
                        }, { 
                            name: 'Leave Group', 
                            link: '#/move-out'
                        }
                    ]
                }, {
                    name: 'Entryway', 
                    link: '#/leave-group'
                }
            ]
        }
    }

That's it! The **nav** module will do the rest. Informational console notifications are thrown if your navigation links lead to nowhere.

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
### GNU GENERAL PUBLIC LICENSE
### Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

#### Preamble

  The GNU General Public License is a free, copyleft license for
software and other kinds of works.

  The licenses for most software and other practical works are designed
to take away your freedom to share and change the works.  By contrast,
the GNU General Public License is intended to guarantee your freedom to
share and change all versions of a program--to make sure it remains free
software for all its users.  We, the Free Software Foundation, use the
GNU General Public License for most of our software; it applies also to
any other work released this way by its authors.  You can apply it to
your programs, too.

  When we speak of free software, we are referring to freedom, not
price.  Our General Public Licenses are designed to make sure that you
have the freedom to distribute copies of free software (and charge for
them if you wish), that you receive source code or can get it if you
want it, that you can change the software or use pieces of it in new
free programs, and that you know you can do these things.

  To protect your rights, we need to prevent others from denying you
these rights or asking you to surrender the rights.  Therefore, you have
certain responsibilities if you distribute copies of the software, or if
you modify it: responsibilities to respect the freedom of others.

  For example, if you distribute copies of such a program, whether
gratis or for a fee, you must pass on to the recipients the same
freedoms that you received.  You must make sure that they, too, receive
or can get the source code.  And you must show them these terms so they
know their rights.

  Developers that use the GNU GPL protect your rights with two steps:
(1) assert copyright on the software, and (2) offer you this License
giving you legal permission to copy, distribute and/or modify it.

  For the developers' and authors' protection, the GPL clearly explains
that there is no warranty for this free software.  For both users' and
authors' sake, the GPL requires that modified versions be marked as
changed, so that their problems will not be attributed erroneously to
authors of previous versions.

  Some devices are designed to deny users access to install or run
modified versions of the software inside them, although the manufacturer
can do so.  This is fundamentally incompatible with the aim of
protecting users' freedom to change the software.  The systematic
pattern of such abuse occurs in the area of products for individuals to
use, which is precisely where it is most unacceptable.  Therefore, we
have designed this version of the GPL to prohibit the practice for those
products.  If such problems arise substantially in other domains, we
stand ready to extend this provision to those domains in future versions
of the GPL, as needed to protect the freedom of users.

  Finally, every program is threatened constantly by software patents.
States should not allow patents to restrict development and use of
software on general-purpose computers, but in those that do, we wish to
avoid the special danger that patents applied to a free program could
make it effectively proprietary.  To prevent this, the GPL assures that
patents cannot be used to render the program non-free.

You may refer to LICENSE.md under the repository for the Terms and Conditions of use.
