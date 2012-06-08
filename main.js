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
        CommandManager          = brackets.getModule("command/CommandManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        Menus                   = brackets.getModule("command/Menus"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        GitHub                  = require("GitHub"),
        _;
    
    require("underscore");
    
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
        GITHUB_LOGIN            = "github.login",
        GITHUB_GIST_DOCUMENT    = "github.gist-document",
        GITHUB_GIST_SELECTION   = "github.gist-selection",
        GITHUB_LOGOUT           = "github.logout";
    
    var prefs,
        auth,
        menu,
        menuSetup,
        user;
    
    
    function _handleError(error) {
        Dialogs.showModalDialog("error-dialog", "GitHub Error", error.statusText + ": " + JSON.parse(error.responseText).message);
    }
    
    function ready() {
        $('#github-login').parent().hide();
        //I have to do this because there's currently no "removeMenuItem"
        if (!menuSetup) {
            menu.addMenuItem("github-gist-doc", GITHUB_GIST_DOCUMENT);
            menu.addMenuItem("github-gist-selection", GITHUB_GIST_SELECTION);
            menu.addMenuDivider();
            menu.addMenuItem("github-logout", GITHUB_LOGOUT);
            menuSetup = true;
        } else {
            $('#github-gist-doc, #github-gist-selection, #github-logout, .divider').parent().show();
        }
        GitHub.currentUser(auth, function (gitUser) {
            user = gitUser;
            $('#github a').first().css({"padding-left": "30px",
                                        "background": "url(" + user.avatar_url + ") no-repeat 6px 7px",
                                        "background-size": "20px"});
        }, _handleError);
    }
    
    function _handleAuthAdded(authorization) {
        if (authorization.hasOwnProperty("scopes")) {
            auth = authorization;
            prefs.setValue("auth", auth);
            ready();
        }
    }
    
    function _handleLoginResult(authorizations, username, password) {
        if (_.isArray(authorizations)) {
            var findAuth = _.find(authorizations, function (nAuth) { return nAuth.note === "brackets-github"; });
            console.log(findAuth);
            if (findAuth !== undefined) {
                auth = findAuth;
                prefs.setValue("auth", auth);
                ready();
            } else {
                GitHub.addAuthorization(username, password, AUTH_NOTE, REQUESTED_SCOPES, _handleAuthAdded, _handleError);
            }
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
            GitHub.listAuthorizations($dlg.find('.username').val(), $dlg.find('.password').val(), _handleLoginResult, _handleError);
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        
         // Run the dialog
        $dlg.modal({
            backdrop: "static",
            show: true,
            keyboard: true
        });
    }
    
    function _handleEditAuth(authorization) {
        if (authorization.hasOwnProperty("scopes")) {
            auth = authorization;
            prefs.setValue("auth", auth);
            ready();
        }
    }
    
    
    function updateAuth() {
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
            
            GitHub.editAuthorization($dlg.find('.username').val(), $dlg.find('.password').val(), auth, AUTH_NOTE, REQUESTED_SCOPES, _handleEditAuth, _handleError);
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        
         // Run the dialog
        $dlg.modal({
            backdrop: "static",
            show: true,
            keyboard: true
        });
    }
    
    function _handleLogout() {
        auth = {};
        prefs.setValue("auth", auth);
        $('#github-login').parent().show();
        $('#github-gist-doc, #github-gist-selection, #github-logout, .divider').parent().hide();
        $('#github a').first().css({"padding-left": "10px",
                                    "background": "none"});
    }
    
    function _handleGistPost(gist) {
        //I know I shouldn't use the error-dialog for this, but dialogs is lacking right now.
        Dialogs.showModalDialog("error-dialog",
                                "Gist Posted",
                                '<div><label>URL:</label><input type="text" value="' + gist.html_url + '"/></div>'
                                + '<div><label>Embed Code:</label><input type="text" value="&lt;script src=&quot;https://gist.github.com/'
                                + gist.id + '.js&quot;&gt;"/></div>');
    }
    
    function _handleGISTDocument() {
        var document = DocumentManager.getCurrentDocument();
        if (document) {
            GitHub.postGist(auth, true,
                            "posted from brackets",
                            document.file.name,
                            document.getText(),
                            _handleGistPost,
                            _handleError);
        }
    }
    function _handleGISTSelection() {
        var editor = EditorManager.getCurrentFullEditor();
        var document = DocumentManager.getCurrentDocument();
        if (document && editor && editor.getSelectedText().length) {
            GitHub.postGist(auth, true,
                            "posted from brackets",
                            document.file.name,
                            editor.getSelectedText(),
                            _handleGistPost,
                            _handleError);
        }
    }
    
    
    /**
     * check if there is a valid authorization stored, that it has the correct scopes, etc.
     */
    function init() {
        _ = window._;
        $('body').append($(LOGIN_DIALOG));
        prefs = PreferencesManager.getPreferenceStorage(PREFERENCES_KEY);
        auth = prefs.getValue("auth") || {};
        menu = Menus.addMenu("GitHub", "github");
        menu.addMenuItem("github-login", GITHUB_LOGIN);
        
        if (auth.hasOwnProperty("scopes")) {
            //make sure this auth has the right permissions, if not, we need to modify the authorization
            if (auth.scopes.length === REQUESTED_SCOPES.length && _.intersection(auth.scopes, REQUESTED_SCOPES).length === REQUESTED_SCOPES.length) {
                //TODO: check to make sure this token hasn't been revoked
                ready();
            } else {
                console.log("[BRACKETS-GITHUB] Scopes don't match, asking to edit auth");
                updateAuth();
            }
        }
    }
    
    CommandManager.register("Login", GITHUB_LOGIN, _handleLogin);
    CommandManager.register("GIST Current Document", GITHUB_GIST_DOCUMENT, _handleGISTDocument);
    CommandManager.register("GIST Current Selection", GITHUB_GIST_SELECTION, _handleGISTSelection);
    CommandManager.register("Logout", GITHUB_LOGOUT, _handleLogout);
    init();
});