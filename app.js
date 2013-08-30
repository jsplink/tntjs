/** 
* Client-side application driver
* @module app
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
define(["crossroads", "underscore", "jquery", "knockout", "tntjs/dataserve", "tntjs/forms", "tntjs/models", "tntjs/views", "tntjs/ui", "tntjs/comm", "tntjs/nav", "tntjs/settings"], 
	function(crossroads,_,$,ko,dataserve,forms,models,views,ui,comm,nav,settings) {
		var	resetToken = ko.observable(undefined),
			resetEmail = ko.observable(undefined),
			PROD = settings.PROD,
			nodeAddress = PROD ? settings.PROD_NODE_ADDRESS : settings.DEV_NODE_ADDRESS,
			DEBUG = settings.DEBUG,
			previousUser = undefined,
			previousMember = undefined,

		var CurrentUser = ko.computed(function() {
			var config = dataserve.AppConfig(),
				user = 'CurrentUser' in config ? config.CurrentUser() : undefined;
			return user;
		}), CurrentGroup = ko.computed(function() {
			var config = dataserve.AppConfig(),
				group = 'CurrentGroup' in config ? config.CurrentGroup() : undefined;
			return group;
		}), CurrentMember = ko.computed(function() {
			var config = dataserve.AppConfig(),
				member = 'CurrentMember' in config ? config.CurrentMember() : undefined;
		});

		crossroads.addRoute('leave-group', function() {
			if ('CurrentGroup' in dataserve.AppConfig()) {
				dataserve.AppConfig().CurrentGroup(undefined);
				dataserve.AppConfig().CurrentMember(undefined);	
			}
			mod.hasher.parseHash('entryway');
		});

		crossroads.addRoute('logout', function() {
			if ('CurrentUser' in dataserve.AppConfig()) {
				dataserve.AppConfig().CurrentUser(undefined);
				dataserve.AppConfig().CurrentMember(undefined);
				dataserve.AppConfig().CurrentGroup(undefined);
				comm.Server.submit_form({
					manager: 'UserManager',
					action: 'logout',
					config: {}
				}, function(data) {
					if (data.status === 1) {
						var cookies = document.cookie.split(";");
					    for (var i = 0; i < cookies.length; i++) {
					        var cookie = cookies[i];
					        var eqPos = cookie.indexOf("=");
					        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
					        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
					    }
					    nav.hasher.setHash('welcome');
					}
				});
			}
		});

		/** log users in if possible */
		crossroads.addRoute('welcome', function(){
			var c = dataserve.AppConfig(),
				u = !!c && !!c.CurrentUser ? c.CurrentUser() : undefined,
				u = !!u && !!u.email ? u : undefined;
			if (u) hasher.setHash('entryway');
		});

		/*********************************
			Setup App Config Listeners
		**********************************/

		var previousUser = undefined,
			/**
			* Listen to changes in user configuration
			* @method groupListener
			* @todo open and test the group socket
			*/
			userListener = ko.computed(function() {
				var appConfig = dataserve.AppConfig(),
					currentUser = 'CurrentUser' in appConfig ? appConfig.CurrentUser() : undefined,
					userToken = !!currentUser ? currentUser.userToken() : undefined;

				console.debug('>>> current user setting as ..');
				console.debug(currentUser);

				if (!!userToken && userToken.length < 33)
					console.error('UserToken should be greater than 32 characters');

				if (!!userToken && (!previousUser || userToken !== previousUser)) {
					comm.Server.submit_form({
						"manager": "UserManager",
						"action": "validate_user",
						"config": {
							"userToken": userToken,
							"userId": currentUser.userId
						}
					}, function(data) {
						if (!data.status)
							nav.hasher.setHash('logout');
					});

					// open up the communication channel
					console.debug('setting user token to ' + userToken);
					comm.tokenset(3, userToken);
					comm.openSocket('userComm', 3);

					// set as previousUser
					previousUser = userToken;
					
					_.defer(function() {
						// grab more particular data
						views.Doorstep.groups.getMore();
						views.Doorstep.invites.getMore();
					})


					// navigate into the group selection process
					nav.hasher.setHash('entryway');
				} else if (!!userToken) {
					console.debug('user already loaded... sending to entryway');
					// user already loaded, send to entryway
					nav.hasher.setHash('entryway');	
				} else {
					nav.hasher.setHash('welcome');
				}
			});

		var previousGroup = undefined,
			/**
			* Listen to changes in group configuration
			* @method groupListener
			* @todo open and test the group socket
			*/
			groupListener = ko.computed(function() {
				var appConfig = dataserve.AppConfig(),
					currentGroup = 'CurrentGroup' in appConfig ? appConfig.CurrentGroup() : undefined,
					groupToken = !!currentGroup ? currentGroup.groupToken() : undefined;
				console.debug('>>> CurrentGroup reset to ' + groupToken);
				if (!!groupToken && (!previousGroup || groupToken !== previousGroup)) {
					if (!groupToken) 
						console.error('groupId defined but groupToken is not');
					
					comm.tokenset(2, groupToken);
					comm.openSocket('groupComm', 2);

					// direct group to overview
					nav.hasher.setHash('overview');

					_.defer(function() {
						// grab objects from server
						views.Activity.logs.getMore();
						views.Group.people.getMore();
						views.Group.invites.getMore();
						views.ChatRoom.messages.getMore();
					})

					//views.reset();
				} else {
					nav.hasher.setHash('entryway');
				}
			});

		var previousMember = undefined,
			/**
			* Listen to changes in member configuaration
			* @todo open member socket
			*/
			memberListener = ko.computed(function() {
				var appConfig = dataserve.AppConfig(),
					currentMember = 'CurrentMember' in appConfig ? appConfig.CurrentMember() : undefined,
					memberToken = !!currentMember ? currentMember.memberToken() : undefined;

				console.info('>>> CurrentMember reset as:');
				console.info(currentMember);

				if (!!memberToken) { // make sure a member is logged in
					console.info('>>> opening the Member socket with token ' + memberToken);
					previousMember = memberToken;
					comm.tokenset(1, memberToken);
					nav.hasher.setHash('overview');
					//views.reset();
				} else if (!!CurrentUser()) {
					dataserve.reset();

					_.defer(function() {
						views.Doorstep.groups.getMore();
						views.Doorstep.invites.getMore();
						nav.hasher.setHash('entryway');
					})
					
				} else { // no user is logged in
					nav.hasher.setHash('');
				}
			});

		return {
			views: views,
			navbar: nav.navbar,
			inviteId: undefined,
			init: function() {
				comm.Server.get_app_config(function(data) {
					for(prop in settings.APP_CONFIG) {
						var val = prop in data ? data[prop] : undefined;
						dataserve.define(prop, data[prop], settings.APP_CONFIG[prop]);
					}
				});
			}
		}
	}
);