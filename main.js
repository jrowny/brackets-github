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
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
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
        GITHUB_GIST_DOCUMENT    = "github.gist.document",
        GITHUB_GIST_SELECTION   = "github.gist.selection",
        GITHUB_GIST_IMPORT      = "github.gist.import",
        GITHUB_LOGOUT           = "github.logout";
    
    var prefs,
        auth,
        menu,
        user;
    
    
    function onError(error) {
        Dialogs.showModalDialog("error-dialog", "GitHub Error", error.statusText + ": " + JSON.parse(error.responseText).message);
    }
    
    function ready() {
        $('#github-login').parent().hide();
   
        CommandManager.get(GITHUB_LOGIN).setEnabled(false);
        CommandManager.get(GITHUB_LOGOUT).setEnabled(true);
        CommandManager.get(GITHUB_GIST_DOCUMENT).setEnabled(true);
        CommandManager.get(GITHUB_GIST_SELECTION).setEnabled(true);
        CommandManager.get(GITHUB_GIST_IMPORT).setEnabled(true);
        
        GitHub.currentUser(auth, function (gitUser) {
            user = gitUser;
            $('#github a').first().addClass("gh-logged-in").css("background-image", "url(" + user.avatar_url + ") ");
            
            CommandManager.get(GITHUB_LOGIN).setName("Logged in as " + user.login);
        }, onError);
    }
    
    //update authorization in preferences, trigger ready
    function setAuth(authorization) {
        if (authorization.hasOwnProperty("scopes")) {
            auth = authorization;
            prefs.setValue("auth", auth);
            ready();
        }
    }
    
    //handle logging into github (check for authorizations)
    function onLoginResult(authorizations, username, password) {
        var findAuth;
        
        //An array of authorizations is returned, check to see if it contains a valid authorization for github brackets
        if (_.isArray(authorizations)) {
            findAuth = _.find(authorizations, function (nAuth) { return nAuth.note === "brackets-github"; });
            if (findAuth !== undefined) {
                setAuth(findAuth);
            }
        }
        
        //no authorization found
        if (findAuth === undefined) {
            GitHub.addAuthorization(username, password, AUTH_NOTE, REQUESTED_SCOPES, setAuth, onError);
        }
    }
    
    //show dialog for login
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
            GitHub.listAuthorizations($dlg.find('.username').val(), $dlg.find('.password').val(), onLoginResult, onError);
            Dialogs.cancelModalDialogIfOpen(".github-login-dialog");
        });
        
         // Run the dialog
        $dlg.modal({
            backdrop: "static",
            show: true,
            keyboard: true
        });
    }
    
    //Ask a user to update their authorization
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
            GitHub.editAuthorization($dlg.find('.username').val(), $dlg.find('.password').val(), auth, AUTH_NOTE, REQUESTED_SCOPES, setAuth, onError);
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
        CommandManager.get(GITHUB_LOGIN).setEnabled(true);
        CommandManager.get(GITHUB_LOGIN).setName("Login");
        CommandManager.get(GITHUB_LOGOUT).setEnabled(false);
        CommandManager.get(GITHUB_GIST_DOCUMENT).setEnabled(false);
        CommandManager.get(GITHUB_GIST_SELECTION).setEnabled(false);
        CommandManager.get(GITHUB_GIST_IMPORT).setEnabled(false);
        
        $('#github a').first().removeClass("gh-logged-in").css("background-image", "none");
    }
    
    function onGistPost(gist) {
        //I know I shouldn't use the error-dialog for this, but dialogs is lacking right now.
        Dialogs.showModalDialog("error-dialog",
                                "Gist Posted",
                                '<div><label>URL:</label><input type="text" value="' + gist.html_url + '"/></div>'
                                + '<div><label>Embed Code:</label><input type="text" value="&lt;script src=&quot;https://gist.github.com/'
                                + gist.id + '.js&quot;&gt;"/></div>');
    }
    
    function _handleGistDocument() {
        var document = DocumentManager.getCurrentDocument();
        if (document) {
            GitHub.postGist(auth, true,
                            "posted from brackets",
                            document.file.name,
                            document.getText(),
                            onGistPost,
                            onError);
        } else {
            //TODO: should probably tell the user
            console.log("[BRACKETS_GITHUB] No document available");
        }
    }
    function _handleGistSelection() {
        var editor = EditorManager.getCurrentFullEditor();
        var document = DocumentManager.getCurrentDocument();
        if (document && editor && editor.getSelectedText().length) {
            GitHub.postGist(auth, true,
                            "posted from brackets",
                            document.file.name,
                            editor.getSelectedText(),
                            onGistPost,
                            onError);
        } else {
            //TODO: should probably tell the user
            console.log("[BRACKETS_GITHUB] Nothing selected");
        }
    }
    
    function onGetGist(gist) {
        
    }
    
    function _handleGistImport() {
        alert("This doesn't work yet :(");
        //GitHub.getGist(auth, id, onGetGist, onError);
    }
    
    
    /**
     * setup module, include css, check for auth
     */
    function init() {
        _ = window._;
        ExtensionUtils.loadStyleSheet(module, "github.css");
        $('body').append($(LOGIN_DIALOG));
        prefs = PreferencesManager.getPreferenceStorage(PREFERENCES_KEY);
        auth = prefs.getValue("auth") || {};
        
        //setup the menu
        menu = Menus.addMenu("GitHub", "github", Menus.AFTER, Menus.AppMenuBar.DEBUG_MENU);
        menu.addMenuItem(GITHUB_LOGIN);
        menu.addMenuItem(GITHUB_LOGOUT);
        menu.addMenuDivider();
        menu.addMenuItem(GITHUB_GIST_DOCUMENT);
        menu.addMenuItem(GITHUB_GIST_SELECTION);
        menu.addMenuItem(GITHUB_GIST_IMPORT);
        //setup the context menu
        var c_menu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
        c_menu.addMenuItem(GITHUB_GIST_SELECTION);
        c_menu.addMenuItem(GITHUB_GIST_DOCUMENT);
                
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
    CommandManager.register("Gist Current Document", GITHUB_GIST_DOCUMENT, _handleGistDocument).setEnabled(false);
    CommandManager.register("Gist Current Selection", GITHUB_GIST_SELECTION, _handleGistSelection).setEnabled(false);
    CommandManager.register("Import Gist", GITHUB_GIST_IMPORT, _handleGistImport).setEnabled(false);
    CommandManager.register("Logout", GITHUB_LOGOUT, _handleLogout).setEnabled(false);
    init();
});