/*
* Miscellaneous utility functions used here and there.
* @note Extends the Object class with a subclass helper.
* @module util
* @prop {object} getObject - Returns the extended Object class.
* @method propComp - Utility method to compare two values using string operators (i.e. propComp[">"](3,2) returns true)
* @collection Base64 - Decodes and encodes Base64
* @method capitalise - Returns a capitalised string.
* @method convertCaseIn - Converts variables from underscore style to camelCase (i.e. 'this_is_a_var' >> 'thisIsAVar')
* @method convertCaseOut - Converts variables from underscore style to camelCase (i.e. 'thisIsAVar' >> 'this_is_a_var')
* @method Namespace - Namespacing helper. This has been replaced with the use of requirejs.
* @method getUUID - Returns a unique identifier.
* @license GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
*/
define(['jquery'], function($) { "use strict";
    /**
    * @method makeSubclass
    * @desc Implementation to achieve object-oriented, prototypal inheritence
    * @see http://stackoverflow.com/questions/1595611/how-to-properly-create-a-custom-object-in-javascript
    */
    Function.prototype.makeSubclass= function(proto) {
        function Class() {
            if (!(this instanceof Class))
                throw('Constructor called without "new"');
            if ('_init' in this) {
                this._init.apply(this, arguments);
            }
        }
        Function.prototype.makeSubclass.nonconstructor.prototype= this.prototype;
        Class.prototype= new Function.prototype.makeSubclass.nonconstructor();
        Class.prototype.goTo = function(url) {
            window.hasher.setHash(url);
        }
        for (var e in proto) { Class.prototype[e] = proto[e]; } // << added in
        return Class;
    };
    Function.prototype.makeSubclass.nonconstructor= function() {};

    /** 
    * @property propSize
    */
    Object.propSize = function(obj) {
        var size = 0, key;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    /**
    * Dynamic string property comparisons
    * @collection propComp
    */
    var propComp = {'<':function(a,b) {return a < b;},'>':function(a,b) {return a>b;},'===':function(a,b) {return a === b; },'==':function(a,b) {return a==b;},'!=':function(a,b) {return a != b;},'!==':function(a,b) {return a!==b;},'<=':function(a,b) {return a<=b;},'>=':function(a,b) {return a >= b;},'IN':function(a,b) {return a.indexOf(b) > -1 ? true : false;}};

    /**
    * Base64 utility functions
    * @collection Base64
    * @method Base64.encode
    * @method Base64.decode
    * @see http://www.webtoolkit.info/javascript-base64.html
    */
    var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(input) {var output="";var chr1,chr2,chr3,enc1,enc2,enc3,enc4;var i=0;input=Base64._utf8_encode(input);while(i<input.length) {chr1=input.charCodeAt(i++);chr2=input.charCodeAt(i++);chr3=input.charCodeAt(i++);enc1=chr1>>2;enc2=((chr1&3)<<4)|(chr2>>4);enc3=((chr2&15)<<2)|(chr3>>6);enc4=chr3&63;if (isNaN(chr2)) {enc3=enc4=64;}else if (isNaN(chr3)) {enc4=64;}
        output=output+
        this._keyStr.charAt(enc1)+this._keyStr.charAt(enc2)+
        this._keyStr.charAt(enc3)+this._keyStr.charAt(enc4);}
        return output;},decode:function(input) {var output="";var chr1,chr2,chr3;var enc1,enc2,enc3,enc4;var i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(i<input.length) {enc1=this._keyStr.indexOf(input.charAt(i++));enc2=this._keyStr.indexOf(input.charAt(i++));enc3=this._keyStr.indexOf(input.charAt(i++));enc4=this._keyStr.indexOf(input.charAt(i++));chr1=(enc1<<2)|(enc2>>4);chr2=((enc2&15)<<4)|(enc3>>2);chr3=((enc3&3)<<6)|enc4;output=output+String.fromCharCode(chr1);if (enc3!=64) {output=output+String.fromCharCode(chr2);}
        if (enc4!=64) {output=output+String.fromCharCode(chr3);}}
        output=Base64._utf8_decode(output);return output;},_utf8_encode:function(string) {string=string.replace(/\r\n/g,"\n");var utftext="";for (var n=0;n<string.length;n++) {var c=string.charCodeAt(n);if (c<128) {utftext+=String.fromCharCode(c);}
        else if ((c>127)&&(c<2048)) {utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128);}
        else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128);}}
        return utftext;},_utf8_decode:function(utftext) {var string="";var i=0;var c=0,c1=c,c2=c1;while(i<utftext.length) {c=utftext.charCodeAt(i);if (c<128) {string+=String.fromCharCode(c);i++;}
        else if ((c>191)&&(c<224)) {c2=utftext.charCodeAt(i+1);string+=String.fromCharCode(((c&31)<<6)|(c2&63));i+=2;}
        else{c2=utftext.charCodeAt(i+1);c3=utftext.charCodeAt(i+2);string+=String.fromCharCode(((c&15)<<12)|((c2&63)<<6)|(c3&63));i+=3;}}
        return string;}}

    function capitalise(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    /**
    * @method convertCaseIn
    * @belongsTo tnt.Util
    * @desc Converts objectified server-side vars to the client-side style
    * @property {object} data - the object to convert
    * @returns {object} data - the Converted object
    * @example converts this_is_a_var to thisIsAVar
    */
    var convertCaseIn = function(data) {
        if (typeof data === 'object') {
            for (var prop in data) {
                // convert dates
                if (data.hasOwnProperty(prop) && data[prop] !== null && data[prop].length == 25) {
                    var t = parseInt(data[prop].slice(0,4)),
                        h = data[prop][4],
                        s = data[prop].slice(11,19);
                    if (h == '-') {
                        if (t !== NaN && t >= 1900) {
                            data[prop] = moment(data[prop]).toDate();
                            if (s == '00:00:00') {
                                moment(data[prop]).add('minutes', (new Date()).getTimezoneOffset());
                            }
                        }
                    }
                }
                // convert underscores to spaces
                if (data.hasOwnProperty(prop) && prop.match(/_/)) {
                    var v = data[prop],
                        k = prop.replace(/_([a-z])/g, function(a) {
                            return a.replace('_', '').toUpperCase();
                        });
                    delete data[prop];
                    data[k] = v;
                    if (typeof data[k] == 'object') convertCaseIn(data[k]);
                } else if (typeof data[prop] === 'object') {
                    convertCaseIn(data[prop]);
                }
            }
        } else if (typeof data === 'string') {
            // converting string
            if (data.match(/_/)) {
                return data.replace(/_([a-z])/g, function(a) {
                    return a.replace('_', '').toUpperCase();
                });
            }
        } else {
            console.error('convertCaseIn cannot handle type ' + (typeof data));
        }
        return data;
    };

    /**
    * @method convertCaseOut
    * @belongsTo tnt.Util
    * @desc Converts objectified server-side var names to the client-side style
    * @property {object} data - the object to convert
    * @returns {object} data - the Converted object
    * @example converts thisIsAVar to this_is_a_var
    */
    function convertCaseOut(data) {
        var r = /([A-Z](?=[a-z]))/g;
        if (typeof data === 'object') {
            for (var prop in data) {
                if (prop.match(r)) {
                    var new_prop = prop.replace(r, "_$1").toLowerCase();
                    data[new_prop] = data[prop];
                    delete data[prop];
                    if (typeof data[new_prop] === 'object') {
                        data[new_prop] = convertCaseOut(data[new_prop]);
                    }
                } else if (typeof data[prop] === 'object') {
                    data[prop] = convertCaseOut(data[prop]);
                }
            }
        }
        return data;
    };

    /** Testing convertcaseout... */
    var test1 = convertCaseOut({"chooseGroup":{"chooseGroupItem":{"offset":0,"limit":5,"order":["groupId","asc"]}}});
    var test2 = convertCaseOut({"memberry":{"groupInvite":{"offset":0,"limit":20,"order":["created","DESC"]}}})
    function isBroken() {
        throw {
            message: 'ConvertCaseOut seems to be broken....',
            htmlMessage: 'ConvertCaseOut seems to be broken....',
            level: 'Show Stopper',
            type: 'Type Error'
        }
    }
    if (!test1.hasOwnProperty('choose_group')) { isBroken(); }
    else if (!test1['choose_group'].hasOwnProperty('choose_group_item')) { isBroken();}
    if (!test2.memberry.group_invite) {isBroken();}

    /**
    * @method getUUID
    * @belongsTo tnt.Util
    * @see http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    */
    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    /**
    * @class Namespace
    * @desc Pretty basic namespacing with $root for knockout compatibility
    * @desc Grabbed from: 
    * @see http://stackoverflow.com/questions/9210249/splitting-up-knockoutjs
    */
    var Namespace = (function() {
        var namespace, global, root;

        namespace = function(identifier, contents) {
            if (!identifier || identifier.length == 0) {
                throw Error("A namespace identifier must be supplied");
            }
            global = window;

            // create the namespace
            var parts = identifier.split(".");
            for (var i = 0; i < parts.length; i += 1) {
                if (!global[parts[i]]) {
                    global[parts[i]] = {};
                }
                if (i == 0) {
                    root = global[parts[i]];
                }
                global = global[parts[i]];
            }

            // assign contents and bind
            if (contents) {
                global.$root = root;
                contents.call(global);
            }
        };

        return namespace;
    })();

    return {
        getObject: Object,
        propComp: propComp,
        Base64: Base64,
        capitalise: capitalise,
        convertCaseIn: convertCaseIn,
        convertCaseOut: convertCaseOut,
        Namespace: Namespace,
        getUUID: getUUID
    }
});