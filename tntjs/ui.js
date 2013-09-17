/**
* General user interface controllers.
* @license GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
*/
define(['jquery', 'bootstrap', 'moment', 'underscore', 'crossroads', 'knockout', 'tntjs/util'],
function($, bootstrap, moment, _, crossroads, ko, Util) { "use strict";
	// extend Object with makeSubclass via Util
	var Object = Util.getObject;

	/** Boolean support for data-binding */
	ko.bindingHandlers.booleanValue = {
	    init: function(element, valueAccessor, allBindingsAccessor) {
	        var observable = valueAccessor(),
	            interceptor = ko.computed({
	                read: function() {
	                    return observable().toString();
	                },
	                write: function(newValue) {
	                    observable(newValue === "true");
	                }
	            });
	        ko.applyBindingsToNode(element, { value: interceptor });
	    }
	};

	/**
	* Controls the splash screen
	* @class SplashScreen
	* @todo
	*/
	var SplashScreen = Object.makeSubclass({
		_init: function(args) {
			var self = this;
		}, show: function(args) {
			var self = this;
			$("#splashscreen").show();
		},hide: function(args) {
			var self = this;
			$("#splashscreen").hide();
		}
	}),

	/**
	* SplashScreen controller
	* @property splashscreen
	*/
	splashscreen = new SplashScreen(),

	/**
	* @class SysComm
	* @desc Interface -> User dialog communication interface
	*/
	SysComm = Object.makeSubclass({
		_init: function(args) {
			var self = this;
			if (args.msg === undefined) args.msg = '';

			self.active = ko.observable(args.active);
			self.msgQueue = ko.observableArray([]);
			self.rotating = false;
			self.initialized = false;

			/**
			* @method rotate
			* @desc Begins rotating through the queued system messages
			* @parameter {boolean} destructive - Delete the messages upon rotation (default is true)
			*/
			self.rotate = function(args) {
				if (!args) 
					args = {
						'destructive':true
					};
				
				if (!self.msgQueue()[0])
					return;

				var msg = self.msgQueue.splice(self.msgQueue().length - 1,1)[0], // grab the msg
					s = (msg.split(' ').length * 200) + 500; // calculate # of ms to display the msg

				if (!args.destructive)
					self.msgQueue.push(msg); // add back if necessary

				if (msg !== '' && msg !== undefined) {
					self.rotating = true;
					self.active(true);

					if (!self.initialized) {
						$("#system-message").popover({ // add the message
							html: true,
							placement: 'bottom',
							selector: '#system-message',
							title: '<center>GroupSpace.com</center>',
							trigger: 'manual'
						});
						self.initialized = true;
					}

					var popover = $("#system-message").attr('data-content', msg).data('bs.popover');
					popover.setContent();
					popover.$tip.addClass(popover.options.placement);

					// show the message
					$("#system-message").popover('show');

					// rotate through the queue if necessary, or deactivate
					setTimeout(function() { // hide remove the message
						$("#system-message").popover('hide');
						if (self.msgQueue.length > 0) {
							self.rotate();
						} else {
							self.rotating = false;
							self.active(false);
						}
					}, s);
				}
			};

			/** 
			* Add a msg to the back of the queue & rotate
			* @method changeTo
			*/
			self.changeTo = function(msg, type) {
				if (!type)
					type = ' message-info ';

				if (self.msgQueue.indexOf(msg) == -1) {
					self.msgQueue.push(msg);	
					if (!self.rotating) self.rotate();
				}
			}
		}
	}),

	/**
	* @class sysComm
	*/
	sysComm = new SysComm({});

	/************************************
			Begin interface listeners
	************************************/

	setInterval(function() {
		$(".adate").each(function() {
			$(this).text(function() {
				return moment(parseInt($(this).attr('title'))).fromNow();
			});
		})
	}, 1000);

	return {
		sysComm: sysComm,
		splash: splashscreen
	}
});