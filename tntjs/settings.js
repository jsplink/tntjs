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
	PROD: false,
	COMM_BACKOFF: true, // exponential backoff
	DEBUG: true,
	DEV_SERVER_ADDRESS: 'http://localhost:8081', 
	DEV_NODE_ADDRESS: 'http://localhost:82',
	APP_CONFIG: {
		'CurrentUser': 'userAccount',
		'CurrentGroup': 'group',
		'CurrentMember': 'member'
	}, navigation: {
		'group': {
			users: ['overview', 'chat-room', 'invite-member' ], 
			items: [
				{ name: 'ChatRoom', link: '#/chat-room' },
				{ name: 'Overview', link: '#/overview'},
				{ name: 'Manage', menu: [
					{ name: 'Invite', link: '#/invite-member' },
				]}
			]
		}, 'entryway': {
			users: [ 'entryway', 'entryway-groups', 'entryway-group-invites', 'group-form'], //'join-group'
			items: [
				{ name: 'Entryway', link: '#/entryway' },
				{ name: 'Create a Group', link: '#/group-form' },
				//{ name: 'Join a Group', link: '#/join-group' }
			]
		}, 'guest': {
			users: ['welcome', 'sign-in', 'sign-up', '#forgot-password', '#reset-password' ],
			items: [
				{ name: 'Welcome', link: '#/welcome' }, 
				{ name: 'Sign Up', link: '#/sign-up' },
				{ name: 'Sign In', link: '#/sign-in' }
			]
		}
	}
});