/**
* @module DataServe
* @belongsTo tnt
* @collection views - Defined views for the application
* @method dispatcher - Listens to the Comm module for incoming objects / lists
* @method define - Sets and gets the application's ID configuration
* @method serveList - Creates and stores a ComputedQuery
* @method emptyList - Resets the list's ComputedQuery
* @class ComputedQuery
* @class ComputedObject
* @license The MIT License (MIT)
*   
*   Copyright (c) 2013 John Sphar
*   
*   Permission is hereby granted, free of charge, to any person obtaining a copy
*   of this software and associated documentation files (the "Software"), to deal
*   in the Software without restriction, including without limitation the rights
*   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*   copies of the Software, and to permit persons to whom the Software is
*   furnished to do so, subject to the following conditions:
*   
*   The above copyright notice and this permission notice shall be included in
*   all copies or substantial portions of the Software.
*   
*   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*   THE SOFTWARE.
*/
define(['jquery', 'crossroads', 'underscore', 'knockout', 'tntjs/util', 'tntjs/comm', 'tntjs/settings', 'tntjs/models'],
function($, crossroads, _, ko, Util, Comm, Settings, Models) { "use strict";
    var mod = {},
        propComp = Util.propComp,
        Object = Util.getObject;
    
    mod.config = ko.observable({});
 
    /** 
    * @method AppConfig
    * @desc Sets and gets the application ID configuration
    * @todo integrate correctly with comm.tokens
    */
    var AppConfig = ko.computed(function() { // public
        var config = mod.config(),
            output = _.extend(config, {
                define: function (prop, config, type) {
                    if (type && config) {
                        console.debug('defining config ' + prop);
                        if(!Models)
                            console.error('DataServe requires Models for property definition.');
                        if (!Models.hasOwnProperty(type))
                            console.error('Models module does not have class of type ' + type);
                        if (Settings.APP_CONFIG[prop] && mod.config()[prop]) {
                            console.debug('building the model from the config');
                            mod.config()[prop](new Models[type](config));
                        } else if (Settings.APP_CONFIG[prop]) {
                            mod.config()[prop] = ko.observable(new Models[type](config));
                        } else {
                            console.error('appconfig property ' + prop + ' has not been defined in settings');
                        }
                        AppConfig.notifySubscribers(AppConfig());
                    } else {
                        mod.config()[prop] = ko.observable(undefined);
                    }
                    
                }
            });
        return output;
    });

    /**
    * @collection views 
    * @desc A collection of ComputedQueries
    */
    mod.views = {};

    /**
    * @collection objects
    * @desc A collection of ComputedObjects
    */
    mod.objects = {};

    /**
    * @class ComputedObject
    * @property {String} view - Name of the view to retrieve
    * @property {Object} args - Object of view/configuration for this ComputedObject instance
    * @example 
    *   {
    *       'view': 'ObjectFormObject',
    *       'config': {'objectId': 1}
    *   }
    * @property {Boolean} loaded - Whether this list is loading or not
    * @returns {Object} - Observable object for view usage
    */
    var ComputedObject = Object.makeSubclass({
        _init: function(args) {
            var self = this;

            /**
            * The name of the Object
            * @property name
            */
            self.name = args.name;

            /**
            * The viewModels for the object
            * @property ob
            */
            self.ob = ko.observable(args.ob);

            /**
            * Whether or not this view is being loaded in or not
            * @property loading
            */
            self.loading = ko.observable(true); // in the process of loading

            /**
            * Retrieves the object
            * @method load
            * @param {function} - Callback function with data passed in from the endpoint
            */
            self.load = function(cb) {
                console.info('>>> getting more of object ' + self.name);

                // send the command to retrieve!
                Comm.Server.get_object(Util.convertCaseOut({
                    'config': {'name': self.name}
                }), cb);
            }
        }
    });

    /**
    * @class ComputedQuery
    * @property {Number} offset - Offset for the list
    * @property {String} view - Name of the view to retrieve
    * @property {String} type - Data type to be used
    * @property {Boolean} hasMore - If the server has more of this list to get
    * @property {Number} limit - How many to grab at a time
    * @property {String} order - ['<property>', '<ASC | DESC>']
    * @property {Array} triggersMore - List of elements which trigger more
    * @property {Array} filteredList - Filtered by the filters given
    * @property {Boolean} loaded - Whether this list is loading or not
    * @todo triggersMore
    * @returns {Array} list - Computed list of data
    */
    var ComputedQuery = Object.makeSubclass({
        _init: function(args) {
            var self = this;
            self.type = args.type;
            self.view = args.view;
            self.modelName = (args.view + Util.capitalise(args.type)).replace(/[0-9]+/g, '');
            self.offset = ko.observable(0);
            self.hasMore = ko.observable(true);
            self.limit = ko.observable(args.limit);
            self.order = ko.observable(args.order);
            self.triggers = args.tiggersMore;
            self.list = ko.observableArray([]);
            self.filteredList = ko.observableArray([]);
            self.loading = ko.observable(true); // in the process of loading

            var required = ['type','limit','filters','order'];
            _.each(required, function(r) {
                if (!r in args) 
                    console.error('ComputedQuery ' + self.view + self.type + ' requires property ' + r);
            });

            if (args.limit == undefined || args.type == undefined)
                console.error('This computed query of type ' + self.type + ' is missing arguments (' + args.type + ')')
            if (args.filters == undefined)
                console.error('ComputedQuery filters of type ' + self.type + ' must be passed')

            /** @todo finish the triggers */
            if (self.triggers) {
                for (var a = 0; a < self.triggers.length; a++) {
                    var $e = self.triggers[a][1],
                        $d = self.triggers[a][2],
                        overflows = ['scroll', 'auto'];
                    
                    if (!overflows.indexOf($($e).css('overflow')))
                        console.error(' Overflow of triggered container ' + W + ' must be auto or scroll.');

                    switch (self.triggers[a][0]) {
                        case 'hitTop': // hit top of list, load more
                            $($e).scroll(function() { // (T) TO DO -- Figure out selectors for calculations
                                if ($($e).scrollTop() === 0) {
                                    self.loading(true);
                                    self.getMore();
                                }
                            });
                            break;
                        case 'hitBot':
                            $($e).scroll(function() { // (T) TO DO -- Figure out selectors for calculations
                                if ($($e).scrollTop() + $($e).height() == $($d).height()) {
                                    self.loading(true);
                                    self.getMore();
                               }
                            });
                            break;
                    }
                }
            }

            /**
            * Updates or initiates the ComputedQuery list.
            * @method update
            * @param {array} - List of JSON object configurations
            */
            self.update = function(l) {
                var pkey = self.list().length > 0 ? self.list()[0]._pkey : undefined,
                    updating_keys = undefined,
                    updates = undefined,
                    updating_object = undefined,

                // 1. Check if we're updating / adding a list of objects
                if (l instanceof Array) {
                    // 1. Check if we're updating objects
                    if (!!pkey) {
                        // 1. Set list of keys we're updating
                        updating_keys = pkey ? _.pluck(l, '_pkey') : undefined;
                        // 2. Set list of objects to update
                        updates = _.where(self.list(), function(i) {
                            return i[pkey] in updating;
                        });
                        // 3. Update the objects
                        _.each(updated, function(ob) {
                            ob.update(l[updating_keys.indexOf[ob[pkey]]]);
                        });
                    } else {
                        // 1. Otherwise we're just creating a new list of objects
                        _.each(l, function(ob) {
                            self.list.push(new Models[self.modelName](ob));
                        });
                    }
                // 2. Otherwise we're just adding/updating one object
                } else {
                    // 1. Check if there's a primary key defined
                    if (!!pkey) {
                        // 1. Grab the object to update
                        updating_object = _.find(self.list(), function(i) {
                            return i[pkey] == l[pkey];  
                        });

                        if (!!updating_object) {
                            // update if found
                            updating_object.update(l);
                        } else {
                            // add if not
                            self.list.push(new Models[self.modelName](l));
                        }
                    } else {
                        self.list.push(new Models[self.modelName](l));
                    }
                }
                // 3. Notify all subscribers
                self.list.notifySubscribers(self.list());
            };

            /** 
            * Resets the ComputedQuery.
            * @method reset
            * @param {boolean} reload - Whether or not to immediately reload the list after reset.
            */
            self.reset = function(reload) {
                self.offset(0);
                self.list([]);
                if (reload === true)
                    self.getMore();
            };

            /**
            * Queries the server for more list objects.
            * @method getMore
            * @param {function} cb - Callback for the server query.
            */
            self.getMore = function(cb) {
                // construct the server query
                var query = {};
                query[self.view] = {};
                query[self.view][self.type] = {
                    offset: self.offset(),
                    limit: self.limit(),
                    order: self.order()
                };
                query = Util.convertCaseOut(query); // needed? (Q)
                Comm.Server.get_list({
                    'config': query
                }, cb);
            }
        }
    });

    /**
    * Create, register, and return a ComputedObject
    * @method serveObject
    * @param {String} objectName - NameID of the object ('objectListPlace86Object')
    */
    function serveObject(objectName, cb) {
        if (objects[objectName] === undefined) {
            objects[objectName] = new ComputedObject({
                ob: undefined,
                name: objectName
            });
            objects[objectName].load(cb);
            return objects[objectName];
        } else {
            return objects[objectName];
        }
    }

    /**
    * Create, register, and return a ComputedQuery.
    * @method serveList
    * @parameter {Object} config - List configuration object
    * @returns observableArray
    * @todo Dynamic reordering (check getMore() === True if we should download)
    * @example 
    *   serveList('objectForm': {
    *     'area': {
    *         'offset': 0,
    *         'limit': 25,
    *         'order': [<prop_name>, <ASC | DESC>], // (T)
    *         'filters': [[]] // (T)
    *     }
    *   });
    */
    function serveList(config) {
        for (var view in config) { // iterate through views
            for (var type in config[view]) { // iterate through data types
                var viewType = view + (type[0].toUpperCase() + type.slice(1,type.length)),
                    viewType = viewType.replace(/[0-9]{1,10}/, ''),
                    views = mod.views;
                if (Models.hasOwnProperty(viewType)) {
                    if (!views[view])
                        views[view] = {};
                    if (!views[view][type])
                        views[view][type] = {};
                    views[view][type] = new ComputedQuery(_.extend(config[view][type],{'view': view,'type': type}));
                } else {
                    console.error('>>> Models has no type of ' + viewType);
                    throw {type: 'TypeError'};
                }
                return mod.views[view][type];
            }
        }
    }

    /**
    * First level dispatch for inbound objects.
    * @method register
    */
    var dispatcher = ko.computed(function() {
        var msgReceived = Comm.incoming(),
            ob = msgReceived.length > 0 ? Comm.incoming.splice(0,1)[0] : undefined,
            objects = mod.objects;

        console.debug('dispatching message...');
        console.debug(ob);

        if (!ob) return;

        for (var keyname in ob) {
            if (Settings.APP_CONFIG[keyname]) {
                console.debug('sending appconfig property ' + keyname + ' to define');
                AppConfig().define(keyname, ob[keyname], Settings.APP_CONFIG[keyname]);
                continue;
            } else {
                 if (keyname in objects) {
                    var model = keyname.replace(/[0-9]+/g,'');
                    if (objects[keyname].ob()) {
                        objects[keyname].ob().update(ob[keyname]);
                    } else {
                        objects[keyname] = new ComputedObject({
                            ob: newOb,
                            name: keyname
                        });
                    }
                } else {
                    for (var _type in ob[keyname]) {
                        var type = Util.capitalise(_type),
                            viewType = keyname + type,
                            model = (keyname + type).replace(/[0-9]+/g, '');
                        //views[view][_type].update(ob[keyname][_type]);
                        if (!!mod.views[keyname] && !!mod.views[keyname][_type]) {
                            mod.views[keyname][_type].update(ob[keyname][_type]);
                        } else {
                            console.warn('Could not register ViewType: ' + viewType);
                        }
                    }
                }
            }
        }
    });

    /**
    * Resets all lists hosted in the DataServe.
    * @method reset
    */
    function reset() {
        for (var view in mod.views) {
            for (var type in mod.views[view]) {
                mod.views[view][type].reset();
            }
        }
    }

    /**
    * Checks to see if the passed in Object is a ComputedQuery Instance
    * @method isComputedQuery
    */
    function isComputedQuery(ob) {
        var verify_properties = ['type','view','offset'],
            passes = true;
            //console.info(ob);
        for (var a = 0; a < verify_properties.length; a++) {
            if (!ob.hasOwnProperty(verify_properties[a])) passes = false;
        }
        return passes;
    }

    Models.setDataserve(mod);

    return {
        define: function(name, model, type) {
            AppConfig().define(name, model, type);
        }, AppConfig: AppConfig,
        isComputedQuery: isComputedQuery,
        reset: reset,
        serveList: serveList,
        serveObject: serveObject
    }
});