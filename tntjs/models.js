/*
* Namespace for front-end application models.
* @module models
* @method setDataserve - Used by the dataserve to set the dataserve in this module. Circular dependency needed for both modules to be stable.
* @license GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
*/
define(["underscore", "knockout", "tntjs/dataserve", "tntjs/comm", "tntjs/util"], function(_, ko, dataserve, comm, util) { "use strict";
	var Object = util.getObject,
		dataserve = ko.observable(dataserve),
		Server = comm.Server,
		CurrentGroup = ko.computed(function() {
			var dataserve = dataserve != undefined ? dataserve() : undefined,
				config = dataserve != undefined ? dataserve.AppConfig() : {},
				hasGroup = config.hasOwnProperty('CurrentGroup'),
				group = hasGroup ? config.CurrentGroup() : undefined;
			return group;
		}),
		CurrentUser = ko.computed(function() {
			var dataserve = dataserve != undefined ? dataserve() : undefined,
				config = dataserve != undefined ? dataserve.AppConfig() : {},
				hasGroup = config.hasOwnProperty('CurrentUser'),
				group = hasGroup ? config.CurrentUser() : undefined;
			return group;
		}),
		CurrentMember = ko.computed(function() {
			var dataserve = dataserve != undefined ? dataserve() : undefined,
				config = dataserve != undefined ? dataserve.AppConfig() : {},
				hasGroup = config.hasOwnProperty('CurrentMember'),
				group = hasGroup ? config.CurrentUser() : undefined;
			return group;
		}), DAY = 1000 * 24 * 60 * 60;

	/**
	* Checks datatypes, required properties
	* @class Model
	* @param {Array} args - A list of arguments
	* @param {Array} constructors - A list of [Constructor, PropName, ObservableFlag] 
	* @method update - Updates the model with the passed in object (re-checks data-types, etc.)
	* @raises TypeError
	* @todo Deprecate timezone adjustment from timezone-naive UTC values
	* @todo Object references & relationships.
	* @todo Cleanup & refactor
	*/
	var Model = Object.makeSubclass({
		_init: function(self, args, constructors) {
			self._props = [];

			// require args and constructors
			if (constructors == undefined || args == undefined) {
				throw {
					name: "Type Error",
					level: "Show Stopper",
					message: "Expecting constructor definitions.",
					htmlMessage: "Expecting constructor definitions."
				};
			}

			// produce list of expected properties
			for (var a = 0; a < constructors.length; a++) {
				self._props.push(constructors[a][1]);
			}

			// warn of missing expeted property
			for (var prop in constructors) {
				if (!prop in args)
					console.warn('Warning: Model '+self._class+' expected property '+prop);
			}

			var m = self._pkey.match(/([a-zA-Z]+)\|([a-zA-Z]+)/);
			if (m && m.length > 2) {
				if (!(m[1] in args)) {
					console.error('>>> Model ' + self._class + ' is missing primary key #1 property ' + m[1]);
				} else if (!(m[2] in args)) {
					console.error('>>> Model ' + self._class + ' is missing primary key #1 property ' + m[2]);
				} else {
					self[self._pkey] = args[m[1]] + args[m[2]];
					console.info('>>> Model ' + self._class + ' multiple pkey ' + m[1] + m[2] + ' is ' + self[m[1] + m[2]]);
				}
			} else if (!(self._pkey in args)) {
				console.error(">>> Model " + self._class + " is missing primary key property " + self._pkey);
			}
			
			// map the properties into this object
			// (Q) wtf moment() tzoffset being subtracted?
			_.map(args, function(val,key) {
				var idx = self._props.indexOf(key);
				if (idx >= 0) {
					var type = constructors[idx][0], // type
						prop = constructors[idx][1], // prop
						observe = constructors[idx][2]; // observable
					if (type === 'Array') { // (T) make recursive (Q)
						if (observe === true) {
							self[prop] = ko.observable(val);
						} else {
							self[prop] = val;
						}
					} else if (type === 'moment' && val != null) { // DEPRECATED
						var tzoff = new Date().getTimezoneOffset();
						if (observe === true) {
							self[prop] = ko.observable(moment(val).subtract('minutes', tzoff));
						} else {
							self[prop] = moment(val).subtract('minutes', tzoff);
						}
					} else if (type === 'Date') {
						if (observe === true) {
							self[prop] = ko.observable(new Date(val));
						} else {
							self[prop] = new Date(val);
						}
					} else if (type === 'epoch') {
						if (observe === true) {
							self[prop] = ko.observable(moment(new Date(val)).valueOf());
						} else {
							self[prop] = moment(new Date(val)).valueOf();
						}
					} else if (observe === true) {
						self[prop] = ko.observable(val);
					} else {
						self[prop] = val;
					}
				}
			});

			self.update = function(args) {
				if (ko.isObservable(args)) {
					throw {type: 'TypeError',
					msg: 'Updating with observables not supported'}
				}
				for (var prop in args) {
					if (!prop in _props) {
						throw {type: 'TypeError',
						msg: 'Expected property ' + prop + ' to be in the Model construct'}
					}
				}
				for (var a = 0; a < constructors.length; a++) {
					var type = constructors[a][0], // type
						prop = constructors[a][1], // prop
						observe = constructors[a][2]; // observable
					if (prop in args) {
						// 1. Set the value to be set
						var val = args[prop],
							typeError = {type: 'TypeError',
								msg: 'Expected property ' + prop + ' of model ' + self._class + ' to be of type ' + type + ' but was ' + val + ' instead'
							};
						// 2. Check the type
						if (type == 'Array') {
							if (!(val instanceof Array)) throw typeError;
						} else if ((type == 'moment' || type == 'Date' || type == 'epoch') && val != null) {
							if (!moment(val).isValid()) throw typeError;
						} else if (type == 'String') {
							if (!typeof(val) == "string") throw typeError;
						} else if (type == 'Number') {
							if (!typeof(val) == "number") throw typeError;
						} else if (type == 'Boolean') {
							if (!typeof(val) == 'boolean') throw typeError;
						}
						// 3. Set the value to the observable if possible
						if (observe) {
							console.debug('>>> setting property ' + prop + ' in model ' + self._class);
							self[prop](args[prop]);
						} else {
							// warn about updating an unobservable
							console.warn('Property ' + prop + ' of model ' + self._class + ' is being updated, and is not an observable... (Q)');
							self[prop] = args[prop];
						}
					}
				}
			}
		}
	}),

	userAccount = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'userAccount';
			self._pkey = 'userId';
			self._order = 'userCreated';
			self._references = {};
			Model.prototype._init(self, args, [
				["Number", "userId", false],
				["String", "email", true],
				["String", "userToken", true],
				["String", "contactName", true],
				["String", "socialProfile", true],
				["Date", "birthday", true],
				["String", "picture", true],
				["Boolean", "guest", true],
				["moment", "userCreated", false],
				["String", "mobilePhone", true],
				["String", "address", true],
				["String", "aptSuite", true],
				["String", "city", true],
				["String", "country", true],
				["moment", "lastSeen", true]
			]);
		}
	}),

	groupType = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'groupType';
			self._pkey = 'groupId';
			self._references = {};

			Model.prototype._init(self, args, [
				["Number", "groupId", false],
				["String", "groupStyleType", false],
				["String", "description", false],
				["Array", "pictureUrls", true],
				["Boolean", "original", false],
				["Number", "popularity", true]
			]);
			
			self._active = ko.observable(false);
			self.active = ko.computed({
				read: function() { return self._active() },
				write: function() { self._active(!self._active()); }
			});
			
			self.selected = ko.computed(function() {
				var dataserve = dataserve(),
					appConfig = dataserve != undefined ? dataserve.AppConfig() : undefined,
					currentGroup = appConfig != undefined ? appConfig.CurrentGroup() : undefined,
					currentType = currentGroup.groupStyleType();

				return currentType == self.groupStyleType;
			});
		}
	}),
	
	/**
	* Used for the CurrentGroup property
	* @class group
	*/
	group = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'group';
			self._pkey = 'groupId';
			self._references = { 'GroupType': 'groupStyleType' };

			Model.prototype._init(self, args, [
				["Number", "groupId", false],
				["String", "groupToken", true],
				["String", "groupStyleType", true],
			]);
		}
	}),

	groupMember = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'member';
			self._pkey = 'memberId';
			self._references = { 'Group': 'groupId' };
			Model.prototype._init(self, args, [
				["Number", "memberId", false],
				["Number", "groupId", false],
				["Number", "workload", true],
				["String", "memberStatus", true],
				["String", "memberStatusCreated", true],
				["String", "groupNickname", true],
				["Array",  "preferTaskDays", true],
				["String", "contactName", true],
				["moment", "birthday", true],
				["String", "picture", true],
				["String", "memberCreated", false],
				["String", "mobile", true],
				["String", "email", true],
				["moment", "lastSeen", true],
			]);
		}
	}),

	/**
	* @class areaFormMember
	*/
	areaFormMember = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'member';
			self._pkey = 'memberId';
			self._references = { 'Group': 'groupId' };
			Model.prototype._init(self, args, [
				["Number", "memberId", false],
				["Number", "groupId", false],
				["String", "contactName", true],
				["String", "picture", true]
			]);

			self.selected = ko.observable(false);
			self.unselect = function() {
				self.selected(false);
			}
			self.select = function() {
				self.selected(true);
			}
		}
	}),

	/**
	* @class member
	* @desc Used for the CurrentMember app config property
	*/
	member = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'member';
			self._pkey = 'memberId';
			self._references = { 'Group': 'groupId' };

			Model.prototype._init(self, args, [
				["Number", "memberId", false],
				["String", "memberToken", true],
				["Number", "groupId", false],
				["Number", "workload", true],
				["String", "memberStatus", true],
				["String", "memberStatusCreated", true],
				["String", "groupNickname", true],
				["Array",  "preferTaskDays", true],
				["String", "contactName", true],
				["moment", "birthday", true], // DOES THIS WORK?
				["String", "picture", true],
				["String", "memberCreated", false],
				["String", "mobile", true],
				["String", "email", true],
				["moment", "lastSeen", true]
			]);
		}
	}),

	chatRoomChatMessage = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			console.info('constructing a chat message');
			self._class = 'chatMessage';
			self._view = 'chatRoom';
			self._pkey = 'chatMessageId';
			self._references = { 
				'Group': 'groupId', 
				'Member': ['author', 'memberId']
			};
			Model.prototype._init(self, args, [
				["Number", "chatMessageId", false],
				["Object", "authorName", true],
				["Object", "authorPicture", false],
				["Number", "groupId", false],
				["String", "chatMessage", false, true],
				["Boolean", "broadcast", false],
				["String", "created", false],
				["Boolean", "asGroup", false],
				["Boolean", "yesNo", true]
			]);

			self.groupNickname = ko.computed(function() {
				var ct = CurrentMember(),
					hn = ct != undefined ? ct.groupNickname() : '';
				return hn;
			});

			self.authorFirstName = ko.computed(function() {
				var name = self.authorName();
				if (name != undefined)
					return name.split(' ')[0];
			});

			self.answers = ko.observable({
				list:ko.observableArray([])
			}); // all answers

			if (self.yesNo() === true) {
				dataserveConfig = {'chatRoom': {}};
				dataserveConfig['chatRoom']['chatMessageMember' + self.chatMessageId] = {
					filters: [[]],
					limit: 20,
					order: ['created', 'ASC']
				}
				self.answers(dataserve().serveList(dataserveConfig));
				dataserve().getMoreStack.push(self.answers());
			}
			self.answered = ko.computed(function() {
				var answers = self.answers(),
					answers = answers.list();
				for (var a = 0; a < answers.length; a++) {
					if (answers[a].isCurrentMemberAnswer())
						return answers[a].yesNo() !== null;
				}
			});
			self.expires = ko.computed(function() {
				return self.created + (1000 * 24 * 60 * 60);
			});
			self.response = ko.computed(function() {
				var answers = self.answers(),
					answers = answers.list(),
					tans = _.filter(answers, function(a) {
						return a.isCurrentMemberAnswer();
					}),
					output = tans.length > 0 ? tans[0] : undefined,
					output = output != undefined ? output.yesNo() : undefined;
				return output;
			});
			self.answerYes = function() {
				if (self.yesNo() === true) {
					Server.submit_form({
						manager: 'MemberManager',
						action: 'reply_to_chat_message',
						config: {
							'reply': true,
							'chatMessageId': self.chatMessageId
						}
					});
				}
			};
			self.answerNo = function() {
				if (self.yesNo() === true) {
					Server.submit_form({
						manager: 'MemberManager',
						action: 'reply_to_chat_message',
						config: {
							'reply': false,
							'chatMessageId': self.chatMessageId
						}
					});
				}
			};
		}
	}),

	chatRoomChatMessageMember = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			console.info('constructing a chat message');
			self._class = 'chatMessageMember';
			self._view = 'chatRoom';
			self._pkey = 'memberId';
			self._references = { 
				'Group': 'groupId', 
				'Member': ['author', 'memberId']
			};

			Model.prototype._init(self, args, [
				["Number", "chatMessageId", false],
				["Number", "memberId", false],
				["String", "contactName", true],
				["String", "picture", true],
				["Boolean", "yesNo", true]
			]);

			self.isCurrentMemberAnswer = ko.computed(function() {
				var dataserve = dataserve() == undefined ? undefined : dataserve(),
					appConfig = dataserve != undefined ? dataserve.AppConfig() : undefined,
					currentMember = appConfig != undefined && 'CurrentMember' in appConfig ? appConfig.CurrentMember() : undefined,
					currentMemberId = currentMember != undefined ? currentMember.memberId : undefined;

				console.debug('>>> Checking CurrentMember.memberId (' + currentMemberId + ') with answer memberId (' + self.memberId + ')..');
				console.debug(self.memberId == currentMemberId);

				return (self.memberId == currentMemberId);
			});

			self.yesClass = ko.computed(function() {
				if (self.isCurrentMemberAnswer()) 
					return self.yesNo() === true;
			});

			self.noClass = ko.computed(function() {
					if (self.isCurrentMemberAnswer()) 
						return self.yesNo() === false;
			});
		}
	}),

	groupLogGroupLogItem = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = 'groupLogItem';
			self._view = 'groupLog';
			self._pkey = 'groupLogItemId';
			self._references = { 'Group': 'groupId', 'Member': 'memberId' };

			Model.prototype._init(self, args, [
				["Number", "groupLogItemId", false],
				["Number", "groupId", false],
				["String", "contentString", false, true],
				["String", "className", false],
				["String", "created", false, true]
			]);

			self.groupLogSince = moment(self.created).fromNow();

			var ACTION_ICONS = {
				'group_created': ' icon-group',
				'group_updated': ' icon-edit',
				'group_invite_created': ' icon-envelope',
				'group_invite_deleted': ' icon-trash'
			};

			self.logIcon = ACTION_ICONS[self.className];
		}
	}),

	invite = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = "invite";
			self._pkey = "inviteId";

			Model.prototype._init(self, args, [
				["Number", "inviteId", false],
				["String" ,"token", false],
				["Number", "inviterId", false],
				["Number", "inviteeId", false],
				["String", "inviteeEmail", false],
				["String", "inviteeName", false],
				["Boolean","rsvp", false],
				["Boolean","resent", true],
				["String", "subject", false],
				["String", "note", false],
				["String", "state", true],
				["moment", "created", false],
				["moment", "deleteOn", false]
			]);
		}
	}),

	betaInvite = invite.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = "betaInvite";
			self._pkey = "beta_id";

			Invite.prototype._init(self, args);
		}
	}),

	groupGroupInvite = Model.makeSubclass({
		_init: function(args) {
			var self = this;
			self._class = "groupInvite";
			self._pkey = "inviteId";

			Model.prototype._init(self, args, [
				["Number", "inviteId", false],
				["String", "inviteeEmail", false],
				["String", "inviterName", false, true],
				["String", "inviteeName", false, true],
				["String", "groupkey", false],
				["moment", "cancelledOn", true]
			]);

			if (self['cancelledOn'] == undefined) {
				self['cancelledOn'] = ko.observable(undefined);
			}

			self.cancel = function() {
				Server.submit_form({
					manager: 'GroupManager',
					action: 'cancel_group_invite',
					config: { 'invite_id': self.inviteId }	
				});
			}
		}
	});

	return {
		'setDataserve': function(d) { dataserve(d); },
		'userAccount': userAccount,
		'groupType': groupType,
		'group': group,
		'groupMember': groupMember,
		'member': member,
		'groupLogGroupLogItem': groupLogGroupLogItem,
		'invite': invite,
		'betaInvite': betaInvite,
		'groupGroupInvite': groupGroupInvite
	}
});
