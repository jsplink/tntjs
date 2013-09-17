/**
* Namespace for front-end application views.
* @module Views
* @license GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
*/
define(["underscore", "knockout", "tntjs/util", "tntjs/forms", "tntjs/dataserve", "tntjs/comm"], 
	function(_, ko, Util, Forms, DataServe, Comm) { "use strict";
		var mod = this,
			Object = Util.getObject;

		/**
		* @class View
		* @belongsTo Views
		*/
		var View = Object.makeSubclass({
			_init: function(args) {
				var self = this;

				// check for all required properties
				_.each(["filters", "limit", "order"], function(prop) {
					if (!prop in args)
						throw {msg: 'could not find ' + prop + ' in args'}
				});

				// set properties
				for (var prop in args) {
					self[prop] = args[prop];
				}

				/**
				* Reset all computed queries.
				* @method resetQueries
				*/
				self.resetQueries = function() {
					for (var prop in self) {
						if (DataServe.isComputedQuery(self[prop])) {
							self[prop].list([]);
							self[prop].offset(0);
							self[prop].getMore();
						}
					}
				}
			}
		}),

		/**
		* Member setup, display, and invitations.
		* @view Group
		*/
		Group = View.makeSubclass({
			_init: function(args) {
				var self = this;

				this.people = DataServe.serveList({
					'group': {
						'member': {
							filters: [[]],
							limit: 20,
							order: ['created', 'DESC']
						}
					}
				});

				this.invites = DataServe.serveList({
					'group': {
						'groupInvite': {
							filters: [[]],
							limit: 20,
							order: ['created', 'DESC']
						}
					}
				});

				this.createInvite = Forms.CreateInvite;

				this.moveOut = Forms.MoveOut;
			}
		}),

		/**
		* Display the log of actions within the group
		* @view Activity
		*/
		Activity = View.makeSubclass({
			_init: function(args) {
				var self = this;

				this.logs = DataServe.serveList({
					'groupLog': {
						'groupLogItem': {
							filters: [[]],
							limit: 20,
							order: ['created', 'DESC']
						}
					}
				});
			}
		}),

		/**
		* Room for members to chat in
		* @view ChatRoom
		*/
		ChatRoom = View.makeSubclass({
			var self = this;

			self.messages = DataServe.serveList({
				'chatRoom': {
					'chatMessage': {
						filters: [[]],
						limit: 20,
						order: ['created', 'DESC']
					}
				}
			});

			self.form = new Forms.ChatMessage();
		});

		return {
			'Group': new Group(),
			'Activity': new Activity(),
			'ChatRoom': new ChatRoom(),
			'SignIn': new View({'form': Forms.SignIn}),
			'SignUp': new View({'form': Forms.SignUp}),
			'ResetPassword': new View({'form': Forms.ResetPassword}),
			'ForgotPassword': new View({'form': Forms.ForgotPassword}),
			'ChangePassword': new View({'form': Forms.ChangePassword}),
			'ChangeEmail': new View({'form': Forms.ChangeEmail })
		}
	}
);


