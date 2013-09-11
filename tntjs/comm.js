/*
* Handles all outbound and inbound communication.
* @module comm
* @collection Server - Holds a collection of primary rpc function names.
* @method InstallFunction - Install a rpc function into Server.
* @method incoming - Subscribable method of incoming messages.
* @method isProcessing - Returns true or false whether there is an outbound or inbound object or not.
* @method openSocket - Opens a node socket.io channel to the NODE_ADDRESS with a given name & subsription token.
* @method tokenset - Set a token to be used for HMAC message validation.
* @license GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
*/
define(['jquery', 'hmac', 'base64', 'underscore', 'io', 'knockout', 'tntjs/ui', 'tntjs/nav', 'tntjs/util', 'tntjs/settings'],
function($, CryptoJS, Base64, _, io, ko, UI, Nav, Util, Settings) { "use strict";
	var mod = {},
		LOCAL = Settings.LOCAL,
		SERVER_ADDRESS = Settings.PROD ? Settings.PROD_SERVER_ADDRESS : Settings.DEV_SERVER_ADDRESS,
		NODE_ADDRESS = Settings.PROD ? Settings.PROD_NODE_ADDRESS : Settings.DEV_NODE_ADDRESS,
		
		/**
		* Exponential back-off switch for failed messages.
		* @const COMM_BACKOFF
		* @see settings
		*/
		COMM_BACKOFF = Settings.COMM_BACKOFF,
		Object = Util.getObject,
		
		/**
		* Messaging sockets
		* @property sockets
		*/	
		sockets = {},
		
		/**
		* Functions available on the server
		* @object server
		* @belongsTo Comm
		*/
		Server = {},
		
		/**
		* Client-side push commands which may be triggered by incoming messages
		* @collection clientCommands
		*/
		clientCommands = {
			logout: function() {
				Nav.hasher.setHash('logout');
			}, invite: function() {},
			overlay: function(msg) {
				UI.activateOverlay(msg);
			}, 
			checkEmail: function(email) {
				$("#check-email-text").text(email);
				$("#check-email").modal({
					keyboard: false,
					backdrop: 'static'
				});
			}, removeOverlay: function() { 
				UI.deactivateOverlay();
			}, navigate: function(link) {
				Nav.hasher.setHash(link);
			}
		}, 
		
		/**
		* Tokens available for HMAC keying, sorted by priority.
		* @property _tokens
		*/
		_tokens = ko.observable([
			undefined, 
			undefined,
			undefined,
			'75b4ca08fade4db1900296126ae5670e'
		]);


	/** 
	* Queue of signal objects to send to server.
	* @property mod.msgQueue
	*/
	mod.msgQueue = ko.observableArray([]);

	/**
	* Queue of incoming objects from the server
	* @property msgReceived
	*/
	mod.msgReceived = ko.observableArray([]);

	/**
	* Whether or not message(s) are being processed.
	* @returns {boolean}
	* @method isProcessing
	*/
	var isProcessing = ko.computed(function() {
			var inQueue = mod.msgQueue(),
				outQueue = mod.msgReceived();
			return (inQueue.length || outQueue.length) ? true : false;
		}),

		/**
		* This daemon listens and handles the sending of messages.
		* @method messenger
		*/
		messenger = ko.computed(function() {
			var q = mod.msgQueue();
			if (q.length >= 1) {
				if (!q[0].isProcessing) {
					console.debug('>>> sending message ' + q[0].id);
					q[0].send();
				}
			}
		}),

		/** 
		* @property mobileRegWait
		* @desc Used to keep track of exponential backoff for mobile push notification registrations
		*/
		mobileRegWait = 0;

	/**
	* Set and get message validation tokens
	* @method tokens
	* @param {number} priority - The priority for this token
	* @param {string} token - The token
	* @returns {list} tokens keyed by priority
	*/
	mod.tokens = ko.computed({
		write: function(priority, token) {
			console.debug('setting token ' + token + ' to priority ' + priority);
			console.debug(_tokens());
			console.debug(_tokens()[priority + 1]);
			_tokens()[priority + 1] = token;
			console.debug(_tokens()[priority + 1]);
			console.debug('new tokens..');
			console.debug(_tokens());
		}, read: function() {
			return _tokens();
		}
	});

	/**
	* Returns the highest priority token for the HMAC validation key.
	* @method outboundToken
	*/
	function outboundToken() {
		var priority;
		for (var a = 0; a < mod.tokens().length; a++) {
			if (!!mod.tokens()[a])
				return mod.tokens()[a]
		}
	}

	/**
	* Message handler
	* @method handleMessage
	* @param {object} data - The message data
	* @param {string} token - The token to validate the message with (optional)
	* @todo Set validated = false
	* @returns {object} body - The body data for the received message
	*/
	function handleMessage(data, token) {
		var validated = false,
			tks = mod.tokens();

		// parse if necessary
		if (typeof(data) === 'string')
			data = JSON.parse(data);

		// require data
		if (!data) {
			console.warn('data was falsy: ' + data);
			return false;
		}

		// validate the message
		_.each(tks, function(t) {
			if (data.timestamp && data.signature && t && !validated) {
				var isValid = validateMessage(data.timestamp, data.signature, t);
				if (isValid == true) {
					validated = true;
					console.debug('[VALID] with token #' + (mod.tokens().indexOf(t) + 1) );
				}
					
			}
		});

		if (!validated) {
			console.error('Invalid message received');
			return false;
		} else if (!('body' in data)) {
			console.error('Could not find body in message');
			return false;
		}

		// show user notifications
		data = data.body;
		if (data['msg'] !== undefined) { // allow for falsy, empty messages
			if (!data.status) {
				UI.sysComm.changeTo(data.msg, 'error');
			} else {
				UI.sysComm.changeTo(data.msg);
			}
		}

		// return falsy status immediately
		if (!data.status) {
			console.warn('received status of ' + data.status);
			if (!COMM_BACKOFF)
				console.warn('Message backoff disabled = failure complete.');
			return false;
		}

		// check for the data configuration
		if (!data.config) {
			console.warn('no configuration data found');
			return data; // isn't required, just process no further
		}

		// dispatch the object(s)
		mod.msgReceived().push(data.config);
		mod.msgReceived.notifySubscribers(mod.msgReceived());

		// execute any valid, embedded commands (deprecate?) (Q)
		if (data.commands) {
			for (command in data.commands) {
				console.debug('executing command: ' + command);
				if (clientCommands[command]) {
					clientCommands[command](data.commands[command]);
				} else {
					console.error('>>> ERROR: Command ' + command + ' has not been installed')
				}
			}
		}

		return data;
	}

	/**
	* Messages to the HTTP server.
	* @class ServerMessage
	*/
	var ServerMessage = Object.makeSubclass({
		_init: function(args) {
			var self = this;

			self.intervalID = null;
			self.token = args.token;
			self.message = args.message;
			self.isProcessing = false;
			self.uuid = args.quuid; // message id
			self.id = self.uuid.slice(0,4); // arbitrary ID for debug msgs
			self.methodName = args.methodName;
			self.tryNextIn = 500; // exponential backoff timer

			if (args.callback && args.callback instanceof Function) {
				self.callback = args.callback;
				console.debug('Method ' + self.methodName + ' has a callback.');
			} else {
				self.callback = undefined;
				console.debug('Method ' + self.methodName + ' does not have a callback.');
			}

			console.debug('>>> creating message [' + self.id + ']');

			/**
			* Removes the message from the queue
			* @method remove
			* @belongsTo Message
			*/
			self.remove = function() {
				var idx = mod.msgQueue.indexOf(self);
				console.debug('>>> Removing message ' + self.id + ' (idx: ' + idx + ') from queue.');

				// clear the interval
				if (self.intervalID != undefined)
					clearInterval(self.intervalID);

				// Remove from queue
				mod.msgQueue.splice(idx, 1);

				// mod.msgQueue().pop(idx);
				self.isProcessing = false;
			}

			/**
			* Exponential back-off retry for messages.
			* @method makeFailsafe
			* @returns intervalID
			*/
			self.makeFailsafe = function() {
				console.debug('>>> retrying message in ' + (self.tryNextIn / 1000 * 60) + ' seconds...');
				
				setTimeout(function() {
					self.tryNextIn = self.tryNextIn * 2;
					UI.sysComm.changeTo('[' + self.id + '] retrying message in ' + (self.tryNextIn / 1000 * 60) + ' seconds...');
					self.send();	
				}, self.tryNextIn);
			}

			/**
			* Sends the message to the server
			* @method send
			*/
			self.send = function() {
				// 1. show the splashscren
				//splashscreen.show();
				self.isProcessing = true;
				console.debug('>>> sending message');
				console.debug(self.message);

				// 2. send the message
				$.ajax({
				    url: SERVER_ADDRESS + '/ajax/',
				    data: self.message,
				    dataType: 'jsonp',
				    jsonp: 'jsonp',
				    timeout: 10000
				}).done(function(data) {
			    	self.finished(data);
				}).fail(function(e) {
					if (COMM_BACKOFF)
			        	self.makeFailsafe();
				});
			}

			/** 
			* @method finished
			* @todo implement splashscreen
			* @todo makeFailsafe if handMessage returns false?? (Q)
			*/
			self.finished = function(data) {
				console.debug('>>> Message ' + self.id + ' received...');
				console.debug(data);
				data = handleMessage(data);
				self.remove();
				//splashscreen.hide();
				if (!!data) { // trigger callback
					console.debug('>>> Message handled successfully');
					if (self.callback !== undefined) {
						console.debug('sending data to callback if necessary..');
						self.callback(data);
					}
				} else { 
					console.warn('message handler produced no response');
				}
			}
		}
	});

	/**
	* Send a request to the server
	* @method Request
	* @belongsTo Comm
	* @param {string} functionName - The server side api call
	* @param {array} opt_argv - An Array of arguments for the AJAX function
	* @see https://developers.google.com/appengine/articles/rpc
	*/
	function Request(function_name, opt_argv) {
		if (!opt_argv) opt_argv = new Array();

		// Find if the last arg is a callback function; save it
		var callback = null,
			function_name = Util.convertCaseOut(function_name),
			len = opt_argv.length;

		// convert vars to server-side format
		var opt_argv = Util.convertCaseOut(opt_argv),
			query = 'action=' + encodeURIComponent(function_name);

		// if the last argument is a function, make it the callback
		if (len > 0 && typeof opt_argv[len-1] == 'function') {
			callback = opt_argv[len-1];
			opt_argv.length--;
		}

		for (var i = 0; i < opt_argv.length; i++) {
			var key = 'arg' + i;
			var val = JSON.stringify(opt_argv[i]);
			query += '&' + key + '=' + encodeURIComponent(val);
		}

		// add the quuid and time to the query
		var quuid = Util.getUUID();
		query += '&quuid=' + quuid;
		query += '&time=' + new Date().getTime(); // IE cache workaround

		var token = outboundToken();

		// create the message
		var message = new ServerMessage({
			quuid: quuid,
			message: query,
			callback: callback,
			methodName: function_name,
			token: token
		});

		// add to the queue
		mod.msgQueue.push(message);
	}


	/**
	* @method InstallHandler
	* @desc Adds a stub function that will pass the arguments to the AJAX call
	*/
 	function InstallFunction(obj, functionName) {
		obj[functionName] = function() {
			Request(functionName, arguments); 
		}
	}

	/**
	* Retrieves a list of information from the server.
	* @method Comm.server.get_list
	* @param {object} filter - the Filters for the list items
	*/
	InstallFunction(Server, 'get_list');

	/**
	* @method Comm.server.get_object
	*/
	InstallFunction(Server, 'get_object');

	/**
	* Submit a form.
	* @method Comm.server.submit_form
	*/
	InstallFunction(Server, 'submit_form');

	/**
	* @method Comm.server.get_app_config
	*/
	InstallFunction(Server, 'get_app_config');

	/**
	* @class NodeMessenger
	* @property {String} name - The name of the node
	* @property {String} address - The address for the node
	* @property {String} id - ID of the user or group this Node represents
	* @property {String} secret - The token for messege validation
	* @todo deprecate secret & replace for outboundToken
	* @todo exponential node retry backoff
	*/
	var NodeMessenger = Object.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = args.name;
			self.address = args.address;
			self.id = args.token;
			self.secret = args.token;
			self.token = args.token;
		}, connect: function(cb) {
			var self = this,
				timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSS"),
				Base64 = Util.Base64,
				signature = Base64.encode(
					CryptoJS.HmacSHA256(timestamp, self.secret).toString()
				);

			sockets[self.name] = io.connect(self.address);
			sockets[self.name].on('disconnect', function() {
				self.connect();
				self.listen();
				self.disconnectRetries = 0;
			});
			sockets[self.name].on('message', function(data) {
				handleMessage(data);
			});
			sockets[self.name].on('connect', function() {
				sockets[self.name].emit('subscribe', {
					id: self.id,
					type: self.name,
					timestamp: timestamp,
					signature: signature
				});
			});	
		}
	});

	/**
	* @method initAndroidNotifications
	*/
	function initAndroidNotifications() {
   		try {
   			setTimeout(function() {
				pushNotification.register(function(data) {
			    	console.debug('>>> received pushplugin response:');
					data = JSON.parse(data);
			    	console.debug(data);
				}, function(error) {
					console.debug('>>> [Error] with pushplugin...');
					console.debug(error);
					console.debug('>>> Retrying in ' + mobileRegWait / 1000 * 60 + ' seconds...');
					mobileRegWait = mobileRegWait * 2;
					initAndroidNotifications();
				}, {
					"senderID": "869596732400",
					"ecb": "onNotificationGCM"
				});
			}, mobileRegWait);
			console.debug('>>> notification handler setup without error');
		} catch (err) {
			console.error('Uncaught error: ' + err);
		}
	}

	/**
	* @method initIOSNotifications
	*/
	function initIOSNotifications() {
	    pushNotification.register(function(token_msg) {
	    	console.debug('(success) setting up iOS push notification handler');
	    	console.debug(token_msg);
	    }, function(error) {
	    	console.debug('>>> (error) setting up iOS push notification handler');
	    	console.debug(error);
	    }, {
	    	"badge":"true",
	    	"sound":"true",
	    	"alert":"true",
	    	"ecb":"Comm.onNotificationAPN"
	   	});
	}

	/**
	* Creates a new Node messanger located at Comm.<name>
	* @method openSocket
	* @parameter {String} name - Name of the socketed connection
	* @parameter {String} token - Token for request signing
	* @parameter {Boolean} connect - To auto-connect or not
	*/
	function openSocket(name, p, connect) {
		if (!connect) connect = true; // default
		console.debug('Opening socket "' + name + '" at ' + NODE_ADDRESS);
		sockets[name] = new NodeMessenger({
			name: name,
			address: NODE_ADDRESS,
			token: _tokens()[p],
			autoconnect: connect
		});
	}

	/**
	* HMAC message validation.
	* @method validateMessage
	* @parameter Validate a Base64-encoded message via HMAC256
	* @returns {Boolean} - Valid or not
	* @todo Vulnerable if mod.tokens can be accessed by third-parties on the client-side. Encrypt tokens? (Q)
	*/
	function validateMessage(timestamp, signature, key) {
		console.debug('checking msg with timestamp ' + timestamp);
		console.debug('checking msg with sig ' + signature);
		console.debug('checking msg with ey ' + key);
		console.debug(key);
		if (typeof(key) === 'string'){
			return CryptoJS.HmacSHA256(timestamp, key.slice(0,32)) == Util.Base64.decode(signature);
		} else {
			console.warn('key type ' + typeof(key) + ' is not supported');
		}
		
	}

	/**
	* Android message handling framework.
	* @see github//Cordova/PushPlugin.git
	* @todo Finish registration of user gcm
	*/
    function onNotificationGCM(e) {
    	console.debug('Received android GCM message');
    	if (e !== undefined) {
    		e = JSON.parse(e);
    	} else {
    		console.debug('>>> [ERROR] GCM Notification "e" is undefined!');
    		return;
    	}

        switch(e.event) {
            case 'registered':
	            if ( e.regid.length > 0 ) {
	            	console.debug('>>> Registered! Sending regid: ' + e.regId);
					var regId = e.regid;
			    	console.debug('>>> regid: ' + regId + ' ... sending to server...');

			    	// 1. Send to ajax
			    	Server.submit_form({
			    		'manager': 'UserManager',
			    		'action': 'register_gcm_id',
			    		'config': {'regid': regId}
			    	}, function(success) {
			    		console.debug('>>> successfully registered regid with server! Please test me now.');
			    	}, function(failure) {
						console.debug('>>> failed to register regid with server =( (error dump...)');
						console.debug(failure);
			    	});
	            } else {
	            	console.debug(
	            		'ERROR: \'registered\' event without regid...');
	            	console.debug(e.regID);
	            }
	            break;
            case 'message':
            	console.debug('>>>  Received message via GCM...');
            	console.debug(e);
            	console.debug('>>> e.payload.message...');
            	console.debug(e.payload.message);
                // if this flag is set, this notification happened while we were in the foreground.
                // you might want to play a sound to get the user's attention, throw up a dialog, etc.
                if (e.foreground) {
				    console.debug('>>> In the foreground!');
				    // (T) What other JS classes come with notifications.js
                    // if the notification contains a soundname, play it.
                    // var my_media = new Media("/android_asset/www/"+e.soundname);
                    // my_media.play();

                    // Handle this message
                    console.debug('>>> Sending GCM message to Comm handler...');
                    handleMessage(e.payload.message);
                } else {
					// otherwise we were launched because the user touched a notification in the notification tray.   
                    if (e.coldstart) {
						console.debug('>>> Received in Coldstart!');
					// (T) Grab the app config? Load app config in from ... where? Initiate startup routine??
					// (T) Grab notification referenced location for nav?
						console.error('>>> Coldstart UNSUPPORTED!');
                    } else {
                    	console.error('>>> Not in foreground and not coldstarted (UNSUPPORTED)');
                    }
                }

            break;

            case 'error':
                console.debug('ERROR: Received erroneus GCM Message...');
                console.debug(e);
            break;

            default:
            	console.debug('UNKNOWN: Received unknown GCM Message...');
            break;
        }
    }

	/**
	* Process iPhone notification actions
	* @method onNotificationAPN
	* @see github//Cordova/PushPlugin.git
	* @todo Everything (this is the default)
	*/
	function onNotificationAPN(event) {
	    if (event.alert)
	        navigator.notification.alert(event.alert);

	    if (event.sound) {
	        var snd = new Media(event.sound);
	        snd.play();
	    }

	    if (event.badge) {
	        pushNotification.setApplicationIconBadgeNumber(successHandler, event.badge);
	    }
	}

	return {
		'incoming': mod.msgReceived, 
		'Server': Server,
		'isProcessing': isProcessing,
		'openSocket': openSocket,
		'tokenset': function(p,t) {
			mod.tokens(p,t);
		}
	}
});