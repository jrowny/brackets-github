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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, window, $ */

define(function (require, exports, module) {
    'use strict';
    
   
    // Brackets modules
    var PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        Menus                   = brackets.getModule("command/Menus"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        GitHub                  = require("GitHub"),
        _;
    
    require("underscore");
    require("jquery-json");
    
    //consts
    var PREFERENCES_KEY   = "extensions.brackets-github",
        AUTH_NOTE         = "brackets-github",
        REQUESTED_SCOPES  = ["public_repo", "user", "gist"],
        LOGIN_DIALOG      = '  <div class="github-login-dialog template modal hide">'
                            + '    <div class="modal-header">'
                            + '        <a href="#" class="close">&times;</a>'
                            + '        <h1 class="dialog-title">GitHub Login</h1>'
                            + '    </div>'
                            + '    <div class="modal-body">'
                            + '        <p class="dialog-message">Enter your GitHub Login</p>'
                            + '        <input type="text" class="username" placeholder="Login"/>'
                            + '        <input type="password" class="password" placeholder="Password"/>'
                            + '    </div>'
                            + '    <div class="modal-footer">'
                            + '        <a href="#" class="dialog-button btn cancel" data-button-id="cancel">CANCEL</a>'
                            + '        <a href="#" class="dialog-button btn primary" data-button-id="ok">LOGIN</a>'
                            + '    </div>'
                            + '</div>"',
        GITHUB_LOGIN      = "github-login-command",
        GITHUB_GIST       = "github-gist-command";
    
    var prefs,
        auth,
        menu;
    
    
    function _handleReady() {
        $('#github-login').parent().remove();
        menu.addMenuItem("github-gist", GITHUB_GIST);
    }
    
    function _handleAuthAdded(authorization) {
        if (authorization.hasOwnProperty("scopes")) {
            auth = authorization;
            prefs.setValue("auth", auth);
            _handleReady();
        } else {
            console.log(authorization);
        }
    }
    
    function _handleLoginResult(authorizations, username, password) {
        if (_.isArray(authorizations)) {
            var findAuth = _.find(authorizations, function (nAuth) { return nAuth.note === "brackets-github"; });
            console.log(findAuth);
            if (findAuth !== undefined) {
                auth = findAuth;
                prefs.setValue("auth", auth);
                _handleReady();
            } else {
                GitHub.addAuthorization(username, password, AUTH_NOTE, REQUESTED_SCOPES, _handleAuthAdded);
            }
        } else {
            console.log(authorizations);
        }
    }
    
    function _handleLogin() {
        var $dlg = $(".github-login-dialog.template")
            .clone()
            .removeClass("template")
            .addClass("instance")
            .appendTo(window.document.body);
        
        // Click handler for buttons        
        $dlg.one("click", ".dialog-button.cancel", function (e) {
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        $dlg.one("click", ".dialog-button.primary", function (e) {
            GitHub.listAuthorizations($dlg.find('.username').val(), $dlg.find('.password').val(), _handleLoginResult);
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        
         // Run the dialog
        $dlg.modal({
            backdrop: "static",
            show: true,
            keyboard: true
        });
    }
    
    function _handleEditAuth(data) {
        if (data.hasOwnProperty("scopes")) {
            auth = data;
            prefs.setValue("auth", auth);
            _handleReady();
        } else {
            alert("Could not update with proper authorization scopes");
        }
    }
    
    
    function _handleUpdateAuth() {
        var $dlg = $(".github-login-dialog.template")
            .clone()
            .removeClass("template")
            .addClass("instance")
            .appendTo(window.document.body);
        $dlg.find('.dialog-message').html("Brackets-GitHub extension needs to update your authorization to allow new features. Please enter your username and password");
        
        
        // Click handler for buttons        
        $dlg.one("click", ".dialog-button.cancel", function (e) {
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        $dlg.one("click", ".dialog-button.primary", function (e) {
            
            GitHub.editAuthorization($dlg.find('.username').val(), $dlg.find('.password').val(), auth, AUTH_NOTE, REQUESTED_SCOPES, _handleEditAuth);
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        
         // Run the dialog
        $dlg.modal({
            backdrop: "static",
            show: true,
            keyboard: true
        });
    }
    
    function _handleGIST() {
        var document = DocumentManager.getCurrentDocument();
        GitHub.postGIST(auth,
                        "posted from brackets",
                        document.file.name,
                        $.quoteString(document.getText()),
                        function (gist) { console.log(gist); });
    }
    
    
    /**
     * check if there is a valid authorization stored, that it has the correct scopes, etc.
     */
    function init() {
        _ = window._;
        $('body').append($(LOGIN_DIALOG));
        prefs = PreferencesManager.getPreferenceStorage(PREFERENCES_KEY);
        auth = prefs.getValue("auth") || {};
        console.log(auth);
        menu = Menus.addMenu("GitHub", "github");
        menu.addMenuItem("github-login", GITHUB_LOGIN);
        
        if (auth.hasOwnProperty("scopes")) {
            //make sure this auth has the right permissions, if not, we need to modify the authorization
            if (auth.scopes.length === REQUESTED_SCOPES.length && _.intersection(auth.scopes, REQUESTED_SCOPES).length === REQUESTED_SCOPES.length) {
                //TODO: check to make sure this token hasn't been revoked
                _handleReady();
            } else {
                console.log("[GITHUB-BRACKETS] Scopes don't match, asking to edit auth");
                _handleUpdateAuth();
            }
        }
    }
    
    CommandManager.register("Login", GITHUB_LOGIN, _handleLogin);
    CommandManager.register("Make GIST", GITHUB_GIST, _handleGIST);
    init();
});