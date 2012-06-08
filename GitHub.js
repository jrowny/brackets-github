/*
 * Copyright (c) 2012 Jonathan Rowny
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, window, $ */

define(function (require, exports, module) {
    'use strict';
    
    var API_URL = "https://api.github.com";
    
     /**
     * Post a GIST
     */
    function _postGIST(auth, isPublic, description, filename, content, callback, errorback) {
        var jsonData = '{"description": "' + description + '",'
                        + '"public": ' + isPublic + ','
                        + '"files": {'
                        + '"' + filename + '": {'
                        + '"content": ' + content
                        + '}}}';
        $.ajax({
            type: "POST",
            contentType: "application/json",
            url: API_URL + "/gists?access_token=" + auth.token,
            dataType: 'json',
            data: jsonData,
            success: function (data) {
                callback.apply(this, [data]);
            },
            error: function (e) {
                errorback.apply(this, [e]);
            }
        });
    }
    
    /**
     * Get current user info
     */
    function _currentUser(auth, callback, errorback) {
        $.ajax({
            type: "GET",
            contentType: "application/json",
            url: API_URL + "/user?access_token=" + auth.token,
            dataType: 'json',
            success: function (data) {
                callback.apply(this, [data]);
            },
            error: function (e) {
                errorback.apply(this, [e]);
            }
        });
    }
    
    
    /**
     * List Authorizations for given user
     */
    function _listAuthorizations(username, password, callback, errorback) {
        $.ajax({
            type: "GET",
            contentType: "application/json",
            url: API_URL + "/authorizations",
            dataType: 'json',
            success: function (data) {
                callback.apply(this, [data, username, password]);
            },
            error: function (e) {
                errorback.apply(this, [e]);
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(username + ":" + password));
            }
        });
    }
        
    /**
     * add a new authorization
     */
    function _addAuthorization(username, password, note, scopes, callback, errorback) {
        var jsonData = '{"scopes": ["' + scopes.join('","') + '"], "note": "' + note + '"}';
        $.ajax({
            type: "POST",
            contentType: "application/json",
            url: API_URL + "/authorizations",
            data:  jsonData,
            dataType: 'json',
            success: function (data) {
                callback.apply(this, [data]);
            },
            error: function (e) {
                errorback.apply(this, [e]);
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(username + ":" + password));
            }
        });
    }
    
    /**
     * edit an existing authorization
     */
    function _editAuthorization(username, password, auth, note, scopes, callback, errorback) {
        var jsonData = '{"scopes": ["' + scopes.join('","') + '"], "note": "' + note + '"}';
        $.ajax({
            type: "PATCH",
            contentType: "application/json",
            url: API_URL + "/authorizations/" + auth.id,
            data:  jsonData,
            dataType: 'json',
            success: function (data) {
                callback.apply(this, [data]);
            },
            error: function (e) {
                errorback.apply(this, [e]);
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(username + ":" + password));
            }
        });
    }
        
    exports.currentUser = _currentUser;
    exports.postGIST = _postGIST;
    exports.listAuthorizations = _listAuthorizations;
    exports.addAuthorization  = _addAuthorization;
    exports.editAuthorization = _editAuthorization;
});