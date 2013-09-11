/*
* Module configuration settings.
* @module settings
* @license GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
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