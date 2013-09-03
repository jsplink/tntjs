define([
	'jquery', 
	'underscore', 
	'knockout', 
	'hasher', 
	'crossroads', 
	'tntjs/settings'
], function($, _, ko, hasher, crossroads, settings) { "use strict";

	/**
	* Navigation configuration as defined in the settings module
	* @const NAV
	*/
	var NAV = settings.navigation,

		/**
		* Class instance of the navbar
		* @object navbar
		*/
		navbar = undefined,

		/**
		* Module namespace.
		* @collection mod
		*/
		mod = {};

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
		self.groups = [];

		for (var group in args) {
			self.groups.push(new NavBarGroup({
				name: group,
				root: args[group].root,
				children: args[group].children,
				items: args[group].navbar
			}));
		}

		/**
		* Activate the correct navbar configuration
		* @method activate
		* @param {string} aid - the short uri (dashed)
		*/
		self.activate = function(aid) {
			console.debug('activating aid: ' + aid);
			_.each(self.groups, function(group) {
				group.activate(aid);
			});
		}
	}

	/**
	* Set of NavBarItems
	* @class NavBarGroup
	*/
	var NavBarGroup = function(args) {
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
		* List of elements which trigger this set
		* @prop {list} children
		*/
		self.children = args.children;

		/**
		* Whether this set is active or not
		* @prop {boolean} active
		*/
		self.active = ko.observable(false);

		/**
		* Main page for this navigation group.
		* @prop {String} root
		*/
		self.root = args.root;

		/**
		* Activate the appropriate navigation items
		* @method activate
		* @param {string} id - ID of the navigation call
		*/
		self.activate = function(id) {
			_.each(self.items, function(item) {
				item.activate(id);
			});
			console.debug('checking if child ' + id + ' is in group ' + self.name);
			if (self.children.indexOf(id) >= 0) {
				console.debug('true');
				self.active(true);
			} else {
				console.debug('false');
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
			console.warn("#" + self.link.slice(2,self.link.length) + ' isn\'t in the DOM')
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
	* The single navigation bar instance
	* @belongsTo Nav
	*/
	var navbar = new NavBar(NAV);

	/**
	* @method parseHash
	* @parameter {string} newHash - new Hash to parse
	* @parameter {string} oldHash - Changing to this hash now
	*/
	function parseHash(newHash, oldHash) {
		var abc = newHash.split('/');
		
		abc.forEach(function(i) {
			return i.replace(/#/g, '');
		})

		// parse back queries
		if (!!oldHash) {
			var back_hash = oldHash.match(/\?back=#([^&]+)/);
			console.debug('go_to_hash = ')
			if (!!back_hash && back_hash.length > 0) {
				console.debug('Reseting destination to ' + back_hash);
				abc = [back_hash[1]];
			}
		}

		if ((abc.length === 1 && abc[0] === "") || abc === undefined) {
			hasher.setHash('welcome');
		} else {
			// seperate out queries & activate
			var queries = newHash.match(/\?(.+)/),
				options = !!queries && queries.length > 1 ? queries[1].split('&') : {},
				options = _.reduce(options, function(m,o) {
					var opt = o.split('=');
					m[opt[0]] = opt[1];
					return m;
				}, {});

			if (!_.isEmpty(options)) {
				newHash.replace(/\?.+/, '');
				for (var a = 0; a < abc.length; a++) {
					if (abc[a].match(/\?/))
						abc[a] = abc[a].replace(/\?.+/g, '');
				}
			}

			console.debug('activating: ' + abc.join('-'));
			console.debug('with options: (newline)');
			console.debug(options);

			_.defer(function(){
				// activate using ID notation
				activate(_.compact(abc).join('-'), oldHash, options);

				// send to crossroads for extra parsing
				crossroads.shouldTypecast = true;
				console.debug('sending ' + newHash + ' to crossroads...');
				crossroads.parse(newHash);
			});
		}

		/**
		* Activate a page-state
		* @param id {String} - State ID (i.e. '/chores/form?id=25')
		*/
		function activate(id, oldHash, options) {
			var id = id.replace('#', '');
			console.info('>>> Nav activating #' + id)
			var c = $("#" + id).attr('class'),
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
		}
	}

	hasher.initialized.add(parseHash); //parse initial hash
	hasher.changed.add(parseHash); //parse hash changes
	hasher.init(); //start listening for history change

	return {
		navbar: navbar
	}
});