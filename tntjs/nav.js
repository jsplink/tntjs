define(['jquery', 'underscore', 'knockout', 'hasher', 'crossroads', 'tntjs/settings'],
function($, _, ko, hasher, crossroads, settings) { "use strict";
	var NAV = settings.navigation,
		navbar = undefined,
		mod = {};

	mod.hasher = hasher;

	// some configuration tests
	if (!NAV) console.error('Please define the NAV structure in the settings module.');
	var testdummy = [];
	for (var setname in settings.NAV) {
		for (var a = 0; a < settings.NAV[setname].users.length; a++){
			 if (testdummy.indexOf(settings.NAV[setname].users[a]) >= 0)
			 	console.error(settings.NAV[setname].users[a] + ' can only use one navset!');
			 testdummy.push(settings.NAV[setname].users[a]);
		}
	}

	testdummy = null; // destroy reference

	/** @todo deprecate */
	crossroads.ignoreState = true;

	/******************************
		Define extra routes below
	*******************************

	/**
	* Controls the navigation bar
	* @class NavBar
	*/
	var NavBar = function(args) {
		var self = this;
		/**
		* Navigation sets.
		* @prop {list} sets
		*/
		self.sets = [];
		for (setname in args) {
			self.sets.push(new NavBarSet({
				name: setname,
				items: args[setname].items,
				users: args[setname].users
			}));
		}

		/**
		* Activate the correct navbar configuration
		* @method activate
		* @param {string} aid - the short uri (dashed)
		*/
		self.activate = function(aid) {
			console.debug('activating aid: ' + aid);
			_.each(self.sets, function(set) {
				set.activate(aid);
			});
		}
	}


	/**
	* Set of NavBarItems
	* @class NavBarSet
	*/
	var NavBarSet = function(args) {
		var self = this;
		self.name = args.name;

		/**
		* NavBarItems in this particular navset
		* @prop {list} items
		*/
		self.items = _.reduce(args.items, function(m,i) {
			m.push(new NavBarItem(i));
			return m;
		}, []);

		/**
		* List of URI's which trigger this set
		* @prop {list} children
		*/
		self.users = args.users;

		/**
		* Whether this set is active or not
		* @prop {boolean} active
		*/
		self.active = ko.observable(false);

		/**
		* Activate the appropriate navigation items
		* @method activate
		* @param {string} id - ID of the navigation call
		*/
		self.activate = function(id) {
			_.each(self.items, function(item) {
				item.activate(id);
			});
			if (self.users.indexOf(id) >= 0) {
				self.active(true);
			} else {
				self.active(false);
			}
		}
	}

	/**
	* Individual navigation items
	* @class NavBarItem
	*/
	var NavBarItem = function(args) {
		var self = this;
		/**
		* What to display to the user.
		* @prop {string} name
		*/
		self.name = args.name;

		/**
		* Where does the user go? (optional)
		* @prop {string} link
		*/
		self.link = args.link ? args.link : null;
		if (self.link && $("#" + self.link.slice(2,self.link.length)).length === 0) {
			console.error("#" + self.link.slice(2,self.link.length) + ' isn\'t in the DOM')
		}

		/**
		* Menu for this item (optional)
		* @prop {list} menu
		*/
		self.menu = args.menu ? _.reduce(args.menu, function(m,i){
			m.push(new NavBarItem(i));
			return m;
		}, []) : null;

		/**
		* Whether this item is active or not
		* @prop {boolean} active
		*/
		self.active = ko.observable(false);

		/**
		* Self-activation. Just pass in the id which is being activated.
		* @method activate
		* @param {string} id - ID of the activated element
		*/
		self.activate = function(id) {
			var a = id.replace('#', '');
			if (self.link && a === self.link.slice(2,self.link.length)) {
				self.active(true);
			} else {
				self.active(false);
			}
			if (self.menu) {
				_.each(self.menu, function(mi){
					mi.activate(id);
				});
			}
		}
	}

	/**
	* Navigation bar instance
	* @belongsTo Nav
	*/
	var navbar = new NavBar(NAV);

	/**
	* Displays the slidebar for the given main view
	* @method enableSidebar
	* @parameter {String} sidebar - Sidebar name to enable
	*/
	function enableSidebar(sidebar) {
		console.log('>>> enabling sidebar: ' + sidebar);
	
		if (sidebar != undefined) {
			$("[id*=sidebar-]").hide();
			if (sidebar.split('').indexOf('#') > -1){
				$(sidebar).show();
			} else {
				$("#" + sidebar).show();
			}	
		} else {
			console.warn('>>> enabling an undefined sidebar?!');
		}
	}

	/**
	* @method parseHash
	* @parameter {string} newHash - new Hash to parse
	* @parameter {string} oldHash - Changing to this hash now
	*/
	function parseHash(newHash, oldHash) {
		var abc = newHash.split('/');
		console.info('parsing location: ');
		abc.forEach(function(i){return i.replace(/#/, '');})
		console.info(abc);

		// 1. Detect a back-query
		if (abc[0] === 'back' && oldHash !== undefined) {
			var go_to_hash = oldHash.match(/\?back=([^&]+)/);
			if (go_to_hash && go_to_hash.length >= 2) {
				abc[0] = go_to_hash[1];
				console.info('>>> Discovered oldHash "back" parameter: ' + abc[0]);
			}
		}

		if ((abc.length === 1 && abc[0] === "") || abc === undefined) {
			mod.hasher.setHash('welcome');
		} else {
			// seperate out queries & activate
			var queries = newHash.match(/\?(.+)/),
				options = queries && queries.length > 1 ? _.object(queries[1].split('&')) : {};

			if (!_.isEmpty(options)) {
				newHash.replace(/\?.+/, '');
				for (var a = 0; a < abc.length; a++) {
					if (abc[a].match(/\?/))
						abc[a] = abc[a].replace(/\?.+/g, '');
				}
			}

			console.debug('activating...');
			console.debug(abc);
			console.debug(abc.join('-'));

			// activate using ID notation
			activate(_.compact(abc).join('-'), oldHash, options);

			// send to crossroads for extra parsing
			crossroads.shouldTypecast = true;
			console.debug('sending ' + newHash + ' to crossroads...');
			crossroads.parse(newHash);
		}

		function activate(id, oldHash, options) {
			var id = id.replace('#', '');
			console.info('>>> Nav activating #' + id)
			var sidebar = $("#" + id).attr('sidebar'),
				c = $("#" + id).attr('class'),
				nc = c ? c.match(/navclass-([abc])/) : null,
				nc = nc ? nc[1] : null,
				ncs = ['a','b','c','d']; // more can be added if required

			// 1. Show what's being queried and the ancestors
			$("#" + id).show();
			$("#" + id).siblings(".navclass-" + nc).hide();

			// 2. Hide/show closest superior navclasses
			for (a = ncs.indexOf(nc); a > -1; a--) {
				var nc2 = ".navclass-" + ncs[a];
				$("#" + id).closest(nc2).show();
				$("#" + id).closest(nc2).siblings(nc2).hide();
			}

			// 3. Hide/show first-class descendents
			for (a = ncs.indexOf(nc); a < ncs.length; a++) {
				var nc2 = ".navclass-" + ncs[a];
				$("#" + id).find(nc2).first().show();
				$("#" + id).find(nc2).first().siblings(nc2).hide();
			}
			
			// 4. Show the appropriate navbar content
			navbar.activate(id);

			// 5. Handle standard options
			if (!!options) {
				// 1. Override the navbar if options['back'] is set
				var altback = options['back'];
				if (!!altback && !!idtonav[altback]) {
					// 1. Grab the title for the new back window
					altbackname = idtonav[altback]['title']['name'];
					// 2. Override the navbar
					if (altback[0] === '#') {
						var newbar = navbar();
						newbar['back'] = {'name': altbackname,'link': altback};
						navbar(newbar);
					}
				} else if (altback !== undefined) {
					console.warn('>>> Cannot find ' + altback + ' in idtonav');
				}
			}

			// 5. Show the sidebar
			if (sidebar !== undefined) enableSidebar(sidebar);
		}
	}
	
	mod.hasher.initialized.add(parseHash); //parse initial hash
	mod.hasher.changed.add(parseHash); //parse hash changes
	mod.hasher.init(); //start listening for history change

	return {
		navbar: navbar,
		hasher: mod.hasher
	}
});