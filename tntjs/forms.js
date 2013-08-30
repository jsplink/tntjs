/*
* Namespace for the forms within the application.
* @module forms
* @todo Field class.
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
define(["jquery", "underscore", "crossroads", "rrule", "knockout", "jstz", "tntjs/dataserve", "tntjs/comm", "tntjs/ui", "tntjs/settings"],
function($, _, crossroads, RRule, ko, jstz, dataserve, comm, ui, settings) { "use strict";
	var valid = {
	        integer: /^\-?[0-9]+$/,
		    decimal: /^\-?[0-9]*\.?[0-9]+$/,
		    email: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i,
		    alphaName: /^[a-zA-Z-' ]+$/i,
		    password: /^.{6,50}$/g,
		    alphaNumeric: /^[a-z0-9]+$/i,
		    alphaDash: /^[a-z0-9_-]+$/i,
		    natural: /^[0-9]+$/i,
		    numeric: /^[0-9]+$/i,
		    phone: /^(\(?\+?[0-9]*\)?)?[0-9_\- \(\)]*$/ // not yet implemented
		}, 	
		Server = comm.Server,
		CurrentGroup = ko.computed(function() {
			var config = dataserve.AppConfig(),
				hasGroup = config.hasOwnProperty('CurrentGroup'),
				group = hasGroup ? config.CurrentGroup() : undefined;
			return group;
		}), 
		CurrentUser = ko.computed(function() {
			var config = dataserve.AppConfig(),
				hasGroup = config.hasOwnProperty('CurrentUser'),
				group = hasGroup ? config.CurrentUser() : undefined;
			return group;
		});

	/**
	* @class Form
	* @property {String} targetPath - Where to POST i.e. /submit_form/<target>/
	* @property {Array} fields - Field configurations for this form
	* @todo UI loading notification.
	*/
	var Form = Object.makeSubclass({
		_init: function(args) {
			var self = this;

			// (T) Create the sending ui
			self.sending = ko.observable(false);

			/** @collection requiredProps */
			var requiredProps = [
				'name', // name of the form
				'manager', // what <manager> to call
				'serverAction', // what manager.<serverAction> to call
				'setUp',
				'getConfig',
				'isValid', 
				'afterSubmitLocation'
			];

			for (var a = 0; a < requiredProps.length; a++) {
				if (!requiredProps[a] in self) {
					throw {
						type: 'Type Error',
						level: 'Show Stopper',
						message: 'TypeError: Please define ' + requiredProps[a] + ' in form ' + self.name
					};
				}
			}

			/**
			* Submit the form to the Server's submit_form remote procedure call
			* @method submit
			* @belongsTo Form
			*/
			self.submit = function() {
				// submitting the form
				console.info('submitting the form');

				var config = undefined,
					sent = false,
					valid = undefined;

				// validate the form
				try { 
					var valid = self.isValid(); 
				} catch (err) {
					var message = !!err.message ? err.msg : err.message;
					ui.sysComm.changeTo(message);
					return false;
				}

				// get the configuration for the form
				config = {
					manager: self.manager,
					action: self.serverAction,
					config: self.getConfig()
				};

				// show that this form is sending
				self.sending(true);

				// define submission callback
				self.cb = function() {};

				// define extra submission procedures
				if ('_submit' in self)
					self.cb = self._submit;

				// submit the form to the server
				Server.submit_form(config, function(resp) {
					if (resp.status) {
						self.setUp();
						hasher.setHash(self.afterSubmitLocation);
					}
					self.cb();
				});
			};

			/** 
			* @method cancel 
			* @belongsTo Form
			* @desc Cancel the form and send to previous navigation 
			*/
			self.cancel = function() {
				self.setUp();
				if (self.afterSubmitLocation !== undefined) {
					hasher.setHash(self.afterSubmitLocation);
				} else {
					console.warn('afterSubmitLocation is undefined for form: ' + self.name);
					hahser.setHash('back');
				}
			
				if ('_cancel' in self)
					self._cancel();
			}

			self.errorMsg = ko.observable('');
		}
	}),

	/**
	* @class ChatMessage
	* @belongsTo tnt.Forms
	* @inheritsFrom tnt.Forms.Form
	*/
	ChatMessage = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'ChatMessage';
			self.serverAction = 'create_chat_message';
			self.manager = 'MemberManager';
			self.afterSubmitLocation = '#/chat-room';

			self.setUp = function(args) {
				self.message('');
			}

			self.isValid = function() {
				if (self.message == '') {
					return {
						status: 0,
						msg: 'Please enter a message to send'
					}
				} else {
					return { status: 1 }
				}
			}

			self.getConfig = function() {
				return {
					chat_message: self.message(),
					yes_no: self.yesNo(),
					as_group: self.asGroup()
				}
			}

			Form.prototype._init.call(self, args);

			self.message = ko.observable('');
			self.yesNo = ko.observable(false);
			self.asGroup = ko.observable(false);
			self.member = ko.computed(function() {
				var currentUser = CurrentUser();
				if (!currentUser)
					return {};

				return {
					'userName': currentUser.contactName(),
					'picture': 'picture' in currentUser ? currentUser.picture() : ''
				}
			});
		}
	}),

	/** 
	* @form Login
	* @desc SPECIAL FORM -- updates app.CurrentUser
	*/
	SignIn = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'SignIn';
			self.serverAction = 'sign_in'
			self.manager = 'UserManager';
			self.afterSubmitLocation = '#/entryway';

			self.setUp = function() {
				self.email('');
				self.password('');
			}

			self.isValid = function() {
				if (!self.email().match(valid['email'])) {
					throw {
						type: 'Type Error',
						message: 'Please enter a valid email'
					}
					return false;
				} else if (!self.password().match(valid['password'])) {
					throw {
						type: 'Type Error',
						message: 'Please enter a valid password between 6 and 20 characters in length'
					}
					return false;
				} else {
					return true;
				}
			}

			self.getConfig = function() {
				return {
					email: self.email(),
					password: CryptoJS.MD5(self.password()).toString(CryptoJS.enc.Hex)
				}
			}

			Form.prototype._init.call(self, args);	

			self.email = ko.observable('');
			self.emailClass = ko.computed(function() {
				var email = self.email();
				if (email == '') {
					return 'form-group';
				} else if (email.match(valid['email'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
			self.password = ko.observable('');
			self.passwordClass = ko.computed(function() {
				var password = self.password();
				if (password === '') {
					return 'form-group';
				} else if (password.match(valid['password'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
		}
	}),

	SignUp = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'SignUp';
			self.serverAction = 'sign_up';
			self.manager = 'UserManager';
			self.afterSubmitLocation = '#/welcome';
			// self._type = 'User';
			self.setUp = function() {
				self.name('');
				self.password('');
				self.repeatPassword('');
				self.email('');
			}
			self.isValid = function() {
				if (self.name() == '') {
					throw {
						type: 'Type Error',
						message: 'Please enter a name'
					}
					return false;
				} else if (!self.email().match(valid['email'])) {
					throw {
						type: 'Type Error',
						message: 'Please enter a valid email'
					}
					return false;
				} else if (!self.password().match(valid['password']) || self.password() !== self.repeatPassword()) {
					throw {
						type: 'Type Error',
						message: 'Please enter a valid password between 6 and 20 characters in length'
					}
					return false;
				} else {
					return true;
				}
			}
			self.getConfig = function() {
				return {
					name: self.name(),
					email: self.email(),
					password: CryptoJS.MD5(self.password()).toString(CryptoJS.enc.Hex)
				}
			}
			Form.prototype._init.call(self, args);	
			// define fields
			self.name = ko.observable('');
			self.nameClass = ko.computed(function() {
				var name = self.name();
				if (name == '' ) {
					return 'form-group';
				} else if (name.length < 250) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
			self.email = ko.observable('');
			self.emailClass = ko.computed(function() {
				var email = self.email();
				if (email == '') {
					return 'form-group';
				} else if (email.match(valid['email'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
			self.password = ko.observable('');
			self.passwordClass = ko.computed(function() {
				var password = self.password();
				if (password === '') {
					return 'form-group';
				} else if (password.match(valid['password'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
			self.repeatPassword = ko.observable('');
			self.repeatPasswordClass = ko.computed(function() {
				var password = self.password(),
					repeated = self.repeatPassword();
				if (password === '') {
					return 'form-group';
				} else if (password.match(valid['password']) && password === repeated) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
		}
	}),

	ChangeEmail = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'ChangeEmail';
			self.serverAction = 'change_email';
			// self._type = 'UserAccount';
			self.manager = 'UserManager';
			self.afterSubmitLocation = 'welcome';
			/**
			* @method setUp
			*/
			self.setUp = function(args) {
				self.newEmail('');
			}

			/**
			* @method isValid
			*/
			self.isValid = function() {
				if (!self.newEmail().match(valid['email'])) {
					throw {
						level: 'Show Stopper',
						type: 'Type Error',
						message: 'Invalid email. Please try again.',
						htmlMessage: 'Invalid email. Please try again.'
					}
				} else {
					return true;
				}
			}

			/**
			* @method getConfig
			*/
			self.getConfig = function() {
				return { 'email': self.newEmail() }
			}

			Form.prototype._init.call(self, args);	

			self.email = ko.computed(function() {
				var appConfig = dataserve.AppConfig(),
					currentUser = 'CurrentUser' in appConfig ? appConfig.CurrentUser() : undefined,
					email = currentUser !== undefined ? currentUser.email() : undefined;

				if (email === undefined) return '';
				return email;
			});
			self.newEmail = ko.observable('');
			self.emailClass = ko.computed(function() {
				var email = self.newEmail();
				if (email == '') {
					return 'form-group';
				} else if (email.match(valid['email'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
		}
	}),

	ChangePassword = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'ChangePassword';
			self.serverAction = 'change_password';
			self.manager = 'UserManager';
			self.afterSubmitLocation = '#/entryway';
			// self._type = 'User';
			self.setUp = function() {
				self.oldPassword('');
				self.password('');
				self.repeatPassword('');
			}
			self.isValid = function() {
				var oldPassword = self.oldPassword(),
					newPassword = self.password(),
					repeated = self.repeatPassword();
				if (!oldPassword.match(valid['password'])
					|| !newPassword.match(valid['password'])
					|| !repeated.match(valid['password'])) {
					throw {
						type: 'TypeError',
						message: 'Please enter passwords with 6-20 characters'
					}
					return false;
				} else if (newPassword != repeated) {
					throw {
						type: 'TypeError',
						message: 'Please try again'
					}
					return false;
				}
				return true;
			}
			self.getConfig = function() {
				return {
					oldPassword: self.oldPassword(),
					newPassword: self.newPassword()
				}
			}
			Form.prototype._init.call(self, args);	
			// define fields
			self.oldPassword = ko.observable('');
			self.oldPasswordClass = ko.computed(function() {
				var password = self.oldPassword();
				if (password === '') {
					return 'form-group';
				} else if (password.match(valid['password'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
			self.password = ko.observable('');
			self.passwordClass = ko.computed(function() {
				var password = self.password();
				if (password === '') {
					return 'form-group';
				} else if (password.match(valid['password'])) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
			self.repeatPassword = ko.observable('');
			self.repeatPasswordClass = ko.computed(function() {
				var password = self.password(),
					repeated = self.repeatPassword();
				if (password === '') {
					return 'form-group';
				} else if (password.match(valid['password']) && password === repeated) {
					return 'form-group has-success';
				} else {
					return 'form-group has-error';
				}
			});
		}
	}),

	ForgotPassword = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'ForgotPasswordRequest';
			self.serverAction = 'send_password_reset';
			// self._type = 'User';
			self.manager = 'UserManager';
			self.afterSubmitLocation = 'welcome';

			/** @method setUp */
			self.setUp = function(args) {
				self.email('');
			}

			/** @method isValid */
			self.isValid = function() {
				if (!self.email().match(valid['email'])) {
					throw {
						type: 'Type Error',
						message: 'Please enter a valid email for this invite'
					}
				}
			}

			/** @method getConfig */
			self.getConfig = function() {
				return { 
					'email': self.email()
				}
			}

			try {
				Form.prototype._init.call(self, args);	
			} catch(err) {
				console.error(err.message);
			}

			self.email = ko.observable('');

			self.emailClass = ko.computed(function() {
				var email = self.email();
				if (email == '') {
					return 'form-group';
				} else if (email.match(valid['email'])) {
					return ' form-group has-success ';
				} else {
					return ' form-group has-error ';
				}
			});
		}
	}),

	/**
	* Accessed via the ForgotPassword process, ResetPassword is the form a user uses to reset their password.
	* @form ResetPassword
	*/
	ResetPassword = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'PasswordReset';
			self.serverAction = 'reset_password';
			self.manager = 'UserManager';
			self.afterSubmitLocation = 'welcome';

			self.setUp = function(args) {
				self.password('');
				window.resetToken = undefined;
				window.resetEmail = undefined;
			}

			self.isValid = function() {
				var p = self.password(),
					pr = self.passwordRepeat(),
					noToken = self.resetToken
				if (!self.password().match(valid['password'])) {
					throw {
						type: 'Type Error',
						message: 'Please enter a password between 6 and 20 characters in length'
					}
				} else if (!self.resetToken) {
					throw {
						type: 'Type Error',
						message: 'Please click on Forgot Password'
					}
				} else if (!self.resetEmail) {
					throw {
						type: 'Type Error',
						message: 'Required params not met'
					}
				}
			}

			self.getConfig = function() {
				return { 
					'password': CryptoJS.MD5(self.password()).toString(CryptoJS.enc.Hex),
					'resetToken': self.resetToken,
					'email': self.resetEmail
				}
			}

			Form.prototype._init.call(self, args);	

			// fields
			self.password = ko.observable('');
			self.passwordClass = ko.computed(function() {
				var pw = self.password();
				if (!self.password().match(valid['password']) && self.password() != '') {
					return ' form-group has-error ';
				} else {
					return ' form-group has-success ';
				}
			});
			self.passwordRepeat = ko.observable('');
			self.passwordRepeatClass = ko.computed(function() {
				var pw = self.password();
				if (!self.password().match(valid['password']) && self.password() != '') {
					return ' form-group has-error ';
				} else {
					return ' form-group has-success ';
				}
			});
		}
	}),

	GroupForm = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'GroupForm';
			self.serverAction = 'create_group';
			// self._type = 'Group';
			self.manager = 'GroupManager';
			self.afterSubmitLocation = 'overview';

			self.setUp = function() {
				self.nickname('');
				self.password('');
			}

			self.isValid = function() {
				var valid = true;
				_.each([self.nicknameClass(), self.passwordClass()],function(a) {
					if (valid == true) {
						if (!a.match('has-success'))
							valid = false;
					}
				});

				return valid;
			}

			self.getConfig = function() {
				var tz = new Date().getTimezoneOffset(),
					hr = Math.floor(Math.abs(tz / 60)) * (tz < 0 ? -1 : 1),
					_mn = Math.abs(tz % 60),
					mn = _mn < 10 ? _mn + "0" : _mn,
					timezone = (tz < 0 ? "-" : "+") + hr + ":" + mn;
				return {
					nickname: self.nickname(),
					email: dataserve.AppConfig().CurrentUser().email(),
					timezone: jstz.determine().name(),
					password: self.password()
				}	
			}

			Form.prototype._init.call(self, args);	

			self.password = ko.observable('');
			self.passwordClass = ko.computed(function() {
				var password = self.password(),
					pClass = 'form-group';
				if (password !== '' && !password.match(valid['password'])) {
					self.errorMsg('Please enter a password between 6-50 characters in length');
					pClass += ' has-error';
				} else if (password !== '') {
					pClass += ' has-success';
				}
				return pClass;
			});
		}
	}),
	
	InviteForm = Form.makeSubclass({
		_init: function(args) {
			var self = this;
			self.name = 'GroupInvite';
			self.serverAction = 'create_group_invite';
			// self._type = 'Group';
			self.manager = 'GroupManager';
			self.afterSubmitLocation = 'people';

			/**
			* @method setUp
			*/
			self.setUp = function(args) {
				// successful attempt
				self.inviteeEmail('');
				self.inviteeName('');
			}

			/**
			* @method isValid
			*/
			self.isValid = function() {
				if (!self.inviteeEmail().match(valid['email'])) {
					throw {
						type: 'Type Error',
						message: 'Please enter a valid email for this invite'
					}
				} else if (self.inviteeName() == '') {
					throw {
						type: 'Type Error',
						message: 'Please enter your roommate\'s name'
					}
				}
			}

			/**
			* @method getConfig
			*/
			self.getConfig = function() {
				return { 
					'inviteeEmail': self.inviteeEmail(),
					'inviteeName': self.inviteeName()
				}
			}

			try {
				Form.prototype._init.call(self, args);	
			} catch(err) {
				console.error(err.message);
			}

			self.inviteeEmail = ko.observable('');
			self.inviteeName = ko.observable('');
		}
	});

	return {
		'ChatMessage': new ChatMessage(),
		'SignIn': new SignIn(),
		'SignUp': new SignUp(),
		'ChangeEmail': new ChangeEmail(),
		'ChangePassword': new ChangePassword(),
		'ForgotPassword': new ForgotPassword(),
		'ResetPassword': new ResetPassword(),
		'GroupForm': new GroupForm(),
		'JoinGroup': new JoinGroup()
	}
});