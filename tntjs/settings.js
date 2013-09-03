/*
* Module configuration settings.
* @module settings
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
define({

	/**
	* Is this app in production?
	*/
	PROD: false,

	/**
	* Exponential message back-off. Should usually be on.
	*/
	COMM_BACKOFF: true,
	DEBUG: true,
	DEV_SERVER_ADDRESS: 'http://localhost:8081', 
	DEV_NODE_ADDRESS: 'http://localhost:82',

	/**
	* Defining entity names and their associated models.js references.
	* @const APP_IDS
	*/
	APP_IDS: {
		'CurrentUser': 'userAccount',
		'CurrentGroup': 'group',
		'CurrentMember': 'member'
	}, 

	/**
	* Navigational settings for the application.
	*/
	navigation: {

		/**
		* As seen by first-time users.
		*/
		guest: {
			'root': 'welcome',
			'children': [
				'welcome',
				'sign-in',
				'sign-up', 
				'forgot-password',
				'reset-password' 
			], 
			'navbar': [
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
			'root': 'entryway',
			'children': [ 
				'entryway', 
				'entryway-groups', 
				'entryway-group-invites', 
				'group-form',
				'join-home'
			], 
			'navbar': [
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
			'root': 'overview',
			'children': [
				'overview', 
				'chat-room',
				'people',
				'move-out',
				'invite-member'
			], 
			'navbar': [
				{
					name: 'Overview', 
					link: '#/overview'
				}, {
					name: 'Discuss', 
					menu: [
						{ 
							'name': 'Message Thread',
							'link': '#/chat-room' 
						}
					]
				}, { 
					name: 'Manage', 
					menu: [
						{
							'name': 'Invite Member',
							'link': '#/invite-member'
						}, { 
							'name': 'Group Settings', 
							'link': '#/change-nickname' 
						}, { 
							'name': 'Leave Group', 
							'link': '#/move-out'
						}
					]
				}, {
					name: 'Entryway', 
					link: '#/leave-group'
				}
			]
		}
	}
});