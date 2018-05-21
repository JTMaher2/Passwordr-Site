'use strict';

const MDCSnackbar = mdc.snackbar.MDCSnackbar;
const MDCDialog = mdc.dialog.MDCDialog;

// Initializes Passwordr
class Passwordr {
    constructor() {
        this.checkSetup();
        // Shortcuts to DOM elements
        this.passwordList = document.getElementById('passwords');
        this.signOutButton = document.getElementById('sign-out');
        this.changeMasterPasswordButton = document.getElementById('change-master-password');
        this.importExportDataButton = document.getElementById('import-export-data-button');
        this.importXMLButton = document.getElementById('import-xml-button');
        this.importJSONButton = document.getElementById('import-json-button');
        this.importKeePassXMLButton = document.getElementById('import-keepass-xml-button');
        this.exportXMLButton = document.getElementById('export-xml-button');
        this.exportJSONButton = document.getElementById('export-json-button');
        this.exportCSVButton = document.getElementById('export-keepass-csv-button');
        this.newPasswordButton = document.getElementById('new-password');
        this.generateNewPasswordButton = document.getElementById('generate-new-password-button');
        this.generateMasterPasswordButton = document.getElementById('generate-master-password-button');
        this.confirmDeletePasswordButton = document.getElementById('confirm-delete-password-button');
        this.confirmCheckPwnedPasswordButton = document.getElementById('confirm-check-pwned-password-button');
        this.checkPwnedButton = document.getElementById('check-pwned-button');
        this.confirmCheckPwnedButton = document.getElementById('confirm-check-pwned-button');
        this.userPic = document.getElementById('user-pic');
        this.userName = document.getElementById('user-name');
        this.messageSnackbar = new MDCSnackbar(document.getElementById('message-snackbar'));
        this.newPasswordDialog = new MDCDialog(document.getElementById('new-password-dialog'));
        this.masterPasswordDialog = new MDCDialog(document.getElementById('master-password-dialog'));
        this.changeMasterPasswordDialog = new MDCDialog(document.getElementById('change-master-password-dialog'));
        this.importExportDataDialog = new MDCDialog(document.getElementById('import-export-data-dialog'));
        this.checkPwnedDialog = new MDCDialog(document.getElementById('check-pwned-dialog'));
        this.confirmDeletePasswordDialog = new MDCDialog(document.getElementById('confirm-delete-password-dialog'));
        this.confirmCheckPwnedPasswordDialog = new MDCDialog(document.getElementById('confirm-check-pwned-password-dialog'));
        this.encryptingPasswordsDialog = new MDCDialog(document.getElementById('encrypting-passwords-dialog'));
        this.searchBox = document.getElementById('searchBox');
        this.sortOptions = document.getElementById('sortOptions');
        this.numPasswords = 0;
        this.numEncrypted = 0;
        this.PASSWORD_LEN = 32;
        var passwordr = this;
        this.newPasswordDialog.listen('MDCDialog:accept', function () {
            passwordr.newPassword();
        });
        this.masterPasswordDialog.listen('MDCDialog:accept', function () {
            passwordr.setMasterPassword();
        });
        this.changeMasterPasswordDialog.listen('MDCDialog:accept', function () {
            passwordr.changeMasterPassword();
        });
        this.signOutButton.addEventListener('click', this.signOut.bind(this));
        this.changeMasterPasswordButton.addEventListener('click', function (evt) {
            passwordr.changeMasterPasswordDialog.lastFocusedTarget = evt.target;
            passwordr.changeMasterPasswordDialog.show();
        });
        this.importExportDataButton.addEventListener('click', function (evt) {
            passwordr.importExportDataDialog.lastFocusedTarget = evt.target;
            passwordr.importExportDataDialog.show();
        });
        this.checkPwnedButton.addEventListener('click', function (evt) {
            passwordr.checkPwnedDialog.lastFocusedTarget = evt.target;
            passwordr.checkPwnedDialog.show();
        });
        this.newPasswordButton.addEventListener('click', function (evt) {
            passwordr.newPasswordDialog.lastFocusedTarget = evt.target;
            // clear old values (if any)
            document.getElementById('add-name-input').value = '';
            document.getElementById('add-url-input').value = '';
            document.getElementById('add-password-input').value = '';
            document.getElementById('add-confirm-password-input').value = '';
            document.getElementById('add-note-input').value = '';
            passwordr.newPasswordDialog.show();
        });
        this.generateNewPasswordButton.addEventListener('click', this.generatePassword.bind(this, $('#add-password-input'), $('#add-confirm-password-input')));
        this.generateMasterPasswordButton.addEventListener('click', this.generatePassword.bind(this, $('#new-master-password'), $('#confirm-new-master-password')));
        this.importXMLButton.addEventListener('click', this.importXML.bind(this));
        this.importJSONButton.addEventListener('click', this.importJSON.bind(this));
        this.importKeePassXMLButton.addEventListener('click', this.importKeePassXML.bind(this));
        this.exportXMLButton.addEventListener('click', this.exportXML.bind(this));
        this.exportJSONButton.addEventListener('click', this.exportJSON.bind(this));
        this.exportCSVButton.addEventListener('click', this.exportCSV.bind(this));
        this.confirmCheckPwnedButton.addEventListener('click', this.checkAllPwnedPasswords.bind(this));
        $(this.searchBox).on('input', function () {
            passwordr.filterList($(this).val());
        });
        $(this.sortOptions).on('change', function () {
            passwordr.sortList($('#sortOptions :selected').text());
        });
        this.initFirebase();
    }
    // filter the password list based on what user entered in search box
    filterList(text) {
        // if user has cleared search box, reveal everything
        if (text == '') {
            $('.name').each(function () {
                $(this).parent().parent().children().each(function () {
                    $(this).css('display', '');
                });
            });
        }
        $('.name').each(function () {
            // if it doesn't match user input
            var curElem = $(this);
            var curElemTextParts = curElem.text().split(' ');
            for (var i = 0; i < curElemTextParts.length; i++) {
                if (curElemTextParts[i].substring(0, text.length).toLowerCase() != text.toLowerCase()) {
                    $(curElem).parent().parent().children().each(function () {
                        $(this).css('display', 'none');
                    });
                }
                else {
                    $(curElem).parent().parent().children().each(function () {
                        $(this).css('display', '');
                    });
                    break; // there is no need to continue
                }
            }
        });
    }
    // sort the list in a certain way
    sortList(order) {
        var passwordr = this;
        var names = [];
        $('.password_template').each(function () {
            names.push($(this).find('.name').text().toLowerCase());
        });
        names.sort();
        if (order == 'Z-A') {
            names = names.reverse();
        }
        var numInserted = 0;
        for (var i = 0; i < names.length; i++) {
            $('.password_template').each(function () {
                var key = this.id;
                // check if the current password is the next password to be put in list
                if ($(this).find('.name').text().toLowerCase() == names[i]) {
                    // make new div with password template
                    var newPasswordCard = document.createElement('div');
                    newPasswordCard.innerHTML = Passwordr.PASSWORD_TEMPLATE.substring(Passwordr.PASSWORD_TEMPLATE.indexOf('>') + 1, Passwordr.PASSWORD_TEMPLATE.lastIndexOf('</div>'));
                    newPasswordCard.setAttribute('id', key);
                    $(newPasswordCard).prop('class', 'mdc_card password_template');
                    // assign values to template
                    var passwordSection = $(newPasswordCard).find('.password');
                    passwordSection.text($($(this).find('.password')).text());
                    passwordSection.prop('hidden', true);
                    $(newPasswordCard).find('.url').text($($(this).find('.url')).text());
                    $(newPasswordCard).find('.note').text($($(this).find('.note')).text());
                    $(newPasswordCard).find('.name').text($($(this).find('.name')).text());
                    // add event handlers to buttons
                    var revealBtn = newPasswordCard.querySelector('.reveal');
                    revealBtn.addEventListener('click', passwordr.revealPassword.bind(this, passwordSection, revealBtn));
                    var editBtn = newPasswordCard.querySelector('.edit');
                    editBtn.addEventListener('click', passwordr.editPassword.bind(this, newPasswordCard.querySelector('.name'), newPasswordCard.querySelector('.url'), newPasswordCard.querySelector('.password'), newPasswordCard.querySelector('.note'), editBtn, revealBtn, key));
                    newPasswordCard.querySelector('.delete').addEventListener('click', passwordr.deletePasswordButtonClicked.bind(this, key));
                    newPasswordCard.querySelector('.check').addEventListener('click', passwordr.checkPwnedPasswordButtonClicked.bind(this, key));
                    // append template to nth slot after beginning of list
                    passwordr.passwordList.insertBefore(newPasswordCard, $(passwordr.passwordList).children()[numInserted]);
                    // delete original card
                    $(this).remove();
                    numInserted++;
                }
            });
        }
    }
    // Checks that the Firebase SDK has been correctly setup and configured
    checkSetup() {
        if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
            window.alert('You have not configured and imported the Firebase SDK.');
        }
    }
    // Sets up shortcuts to Firebase features, and initiates Firebase Auth
    initFirebase() {
        // Shortcuts to Firebase SDK features
        this.auth = firebase.auth();
        this.database = firebase.firestore();
        // Initiate Firebase Auth, and listen to auth state changes
        this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
    }
    // Signs-out of Passwordr
    signOut() {
        // Sign out of Firebase
        this.auth.signOut().then(function () {
            // Enable sign-in button
            ui.start('#firebaseui-auth-container', uiConfig); // adjust Firebase Auth UI
        }).catch(function (error) {
            console.log("Error: " + error);
        });
    }
    // generates a random password
    generatePassword(passwordField, confirmPasswordField) {
        const length = 20;
        var string = "abcdefghijklmnopqrstuvwxyz"; //to upper 
        var numeric = '0123456789';
        var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
        var password = "";
        var character = "";
        var crunch = true;
        while (password.length < length) {
            var entity1 = Math.ceil(string.length * Math.random() * Math.random());
            var entity2 = Math.ceil(numeric.length * Math.random() * Math.random());
            var entity3 = Math.ceil(punctuation.length * Math.random() * Math.random());
            var hold = string.charAt(entity1);
            hold = (entity1 % 2 == 0) ? (hold.toUpperCase()) : (hold);
            character += hold;
            character += numeric.charAt(entity2);
            character += punctuation.charAt(entity3);
            password = character;
        }
        // populate the password and confirm password fields with the random password
        $(passwordField).text(password);
        $(passwordField).val(password);
        if (confirmPasswordField != null) {
            $(confirmPasswordField).text(password);
            $(confirmPasswordField).val(password);
        }
    }
    // convert an ArrayBuffer into CSV format
    bufferToCSV(buffer, length) {
        var csv = '';
        for (var i = 0; i < length - 1; i++) {
            csv += buffer[i] + ',';
        }
        csv += buffer[length - 1];
        return csv;
    }
    // Encrypt a string using AES-GCM
    encrypt(name, url, password, note, key) {
        var passwordr = this;
        // name
        var nameIV = window.crypto.getRandomValues(new Int8Array(12));
        window.crypto.subtle.encrypt({
            name: "AES-GCM",
            iv: nameIV,
            tagLength: 128
        }, passwordr.encryptionKey, new StringView(name).buffer).then(function (encryptedName) {
            // URL
            var urlIV = window.crypto.getRandomValues(new Int8Array(12));
            window.crypto.subtle.encrypt({
                name: "AES-GCM",
                iv: urlIV,
                tagLength: 128
            }, passwordr.encryptionKey, new StringView(url).buffer).then(function (encryptedUrl) {
                // password
                var passwordIV = window.crypto.getRandomValues(new Int8Array(12));
                window.crypto.subtle.encrypt({
                    name: "AES-GCM",
                    iv: passwordIV,
                    tagLength: 128
                }, passwordr.encryptionKey, new StringView(password).buffer).then(function (encryptedPassword) {
                    // note
                    var noteIV = window.crypto.getRandomValues(new Int8Array(12));
                    window.crypto.subtle.encrypt({
                        name: "AES-GCM",
                        iv: noteIV,
                        tagLength: 128
                    }, passwordr.encryptionKey, new StringView(note).buffer).then(function (encryptedNote) {
                        var encryptedEncodedName = new Int8Array(encryptedName);
                        var encryptedEncodedUrl = new Int8Array(encryptedUrl);
                        var encryptedEncodedPassword = new Int8Array(encryptedPassword);
                        var encryptedEncodedNote = new Int8Array(encryptedNote);
                        var nameWithIV = passwordr.bufferToCSV(nameIV, nameIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedName, encryptedEncodedName.length);
                        var urlWithIV = passwordr.bufferToCSV(urlIV, urlIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedUrl, encryptedEncodedUrl.length);
                        var passwordWithIV = passwordr.bufferToCSV(passwordIV, passwordIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedPassword, encryptedEncodedPassword.length);
                        var noteWithIV = passwordr.bufferToCSV(noteIV, noteIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedNote, encryptedEncodedNote.length);
                        // if this is a new password, there won't be a key
                        if (key == null) {
                            passwordr.database.collection('passwords').add({
                                name: nameWithIV,
                                url: urlWithIV,
                                password: passwordWithIV,
                                note: noteWithIV,
                                userid: passwordr.auth.currentUser.uid
                            }).then(function () {
                                passwordr.numEncrypted++;
                                if (passwordr.numEncrypted == passwordr.numPasswords) {
                                    window.location.reload(true);
                                }
                            })
                                .catch(function (error) {
                                    var data = {
                                        message: 'Error adding password: ' + error,
                                        timeout: 2000,
                                        actionText: 'OK',
                                        actionHandler: function () {
                                        }
                                    };
                                    passwordr.messageSnackbar.show(data);
                                });
                        }
                        else { // it's an existing password
                            passwordr.database.collection('passwords').doc(key).update({
                                name: nameWithIV,
                                url: urlWithIV,
                                password: passwordWithIV,
                                note: noteWithIV
                            }).then(function () {
                                passwordr.numEncrypted++;
                                if (passwordr.numEncrypted == passwordr.numPasswords) {
                                    window.location.reload(true);
                                }
                            })
                                .catch(function (error) {
                                    var data = {
                                        message: 'Error modifying password: ' + error,
                                        timeout: 2000,
                                        actionText: 'OK',
                                        actionHandler: function () {
                                        }
                                    };
                                    passwordr.messageSnackbar.show(data);
                                });
                        }
                    }).catch(function (error) {
                        var data = {
                            message: 'Error encrypting note: ' + error,
                            timeout: 2000,
                            actionText: 'OK',
                            actionHandler: function () {
                            }
                        };
                        passwordr.messageSnackbar.show(data);
                    });
                }).catch(function (error) {
                    var data = {
                        message: 'Error encrypting password: ' + error,
                        timeout: 2000,
                        actionText: 'OK',
                        actionHandler: function () {
                        }
                    };
                    passwordr.messageSnackbar.show(data);
                });
            }).catch(function (error) {
                var data = {
                    message: 'Error encrypting URL: ' + error,
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function () {
                    }
                };
                passwordr.messageSnackbar.show(data);
            });
        }).catch(function (error) {
            var data = {
                message: 'Error encrypting name: ' + error,
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function () {
                }
            };
            passwordr.messageSnackbar.show(data);
        });
    }
    // Add a new password to the database
    newPassword() {
        if (this.checkSignedIn()) {
            var name = document.getElementById('add-name-input').value;
            var url = document.getElementById('add-url-input').value;
            if (name == '' && url == '') {
                var data = {
                    message: 'You must provide either a name or a URL',
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function () {
                    }
                };
                this.messageSnackbar.show(data);
            }
            else {
                if (name == '') {
                    name = ' ';
                }
                if (url == '') {
                    url = ' ';
                }
                var password = document.getElementById('add-password-input').value;
                var confirmPassword = document.getElementById('add-confirm-password-input').value;
                // password:
                // 1) must match confirm password
                // 2) must be at least 8 characters long
                // 3) must contain at least 1 number
                // 4) must contain at least 1 special character
                if (password.length < 8 || password.match(/\d+/g) == null || password.match(/\W+/g) == null) {
                    var data = {
                        message: 'Password must conform to guidelines (i.e. at least 8 characters, at least 1 number, at least 1 special character)',
                        timeout: 2000,
                        actionText: 'OK',
                        actionHandler: function () {
                        }
                    };
                    this.messageSnackbar.show(data);
                }
                else {
                    if (password != confirmPassword) {
                        var data = {
                            message: 'Password must match confirm password',
                            timeout: 2000,
                            actionText: 'OK',
                            actionHandler: function () {
                            }
                        };
                        this.messageSnackbar.show(data);
                    }
                    else {
                        var note = document.getElementById('add-note-input').value;
                        if (note == '') {
                            note = ' ';
                        }
                        this.encrypt(name, url, password, note, null); // do not provide a key
                    }
                }
            }
        }
    }
    setMasterPassword() {
        var passwordr = this;
        if ($('#master-password').val() != null) {
	        if ($('#master-password').val().length <= passwordr.PASSWORD_LEN) {
                var pass = $('#master-password').val();
                while (pass.length < passwordr.PASSWORD_LEN) {
                    pass += '0';
                }
		        window.crypto.subtle.importKey('raw', new StringView(pass).buffer, 'AES-GCM', false, ['encrypt', 'decrypt']).then(function (key) {
        		        passwordr.encryptionKey = key;
        		        // decrypt and show all fields
        		        passwordr.decryptErrorShown = false;
        		        $('.password_template').each(function () {
        		            var current_password = $(this);
        		            var nameHeader = current_password.find('.name');
        		            passwordr.decryptCSV(nameHeader);
        		            var urlHeader = current_password.find('.url');
        		            passwordr.decryptCSV(urlHeader);
        		            var passwordSection = current_password.find('.password');
        		            passwordr.decryptCSV(passwordSection);
        		            var noteSection = current_password.find('.note');
        		            passwordr.decryptCSV(noteSection);
        		        });
        		        setTimeout(function () { passwordr.sortList('A-Z'); }, 1000); // setTimeout is necessary, because otherwise the sorting will be done before list has been decrypted
		        }).catch(function (err) {
        		    var data = {
        		        message: 'Import error: ' + err,
        		        timeout: 2000,
        		        actionText: 'OK',
        		        actionHandler: function () {
        		        }
        		    };
        		    passwordr.messageSnackbar.show(data);
		        });
            } else {
                var data = {
                    message: 'Master password cannot exceed 32 characters.',
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function () {
                        passwordr.masterPasswordDialog.show();
                    }
                };
                this.messageSnackbar.show(data)
            }
        } else {
            var data = {
                message: 'Please provide a master password.',
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function () {
                    passwordr.masterPasswordDialog.show();
                }
            };
            this.messageSnackbar.show(data);
        }
    }
    // changes a user's master password
    changeMasterPassword() {
        var passwordr = this;
        var masterPassword = $('#new-master-password');
        var confirmMasterPassword = $('#confirm-new-master-password');
        if (masterPassword.val() != null) {
            if (masterPassword.val() == confirmMasterPassword.val()) {
                if (masterPassword.val().length >= 8 && masterPassword.val().match(/[a-zA-Z]/) != null && masterPassword.val().match(/\d+/g) != null && masterPassword.val().match(/\W+/g) != null) {
                    while (masterPassword.val().length < 32) {
                        masterPassword.val(masterPassword.val() + '0');
                    }
                    while (masterPassword.length > 32) {
                        masterPassword.val(masterPassword.val().slice(0, -1));
                    }
                    window.crypto.subtle.importKey('raw', new StringView(masterPassword.val()).buffer, 'AES-GCM', false, ['encrypt', 'decrypt']).then(function (key) {
                        passwordr.encryptionKey = key;
                        passwordr.encryptingPasswordsDialog.show(); // show "Please wait..." dialog
                        passwordr.numPasswords = $('.password_template').length;
                        passwordr.numEncrypted = 0;
                        // re-encrypt all passwords' fields
                        $('.password_template').each(function () {
                            var current_password = $(this);
                            var nameHeader = current_password.find('.name');
                            var urlHeader = current_password.find('.url');
                            var noteSection = current_password.find('.note');
                            var passwordSection = current_password.find('.password');
                            // re-encrypt field with new password
                            passwordr.encrypt(nameHeader.text(), urlHeader.text(), passwordSection.text(), noteSection.text(), current_password.attr('id')); // the id is the key                  
                        });
                    }).catch(function (err) {
                        var data = {
                            message: 'Import error: ' + err,
                            timeout: 2000,
                            actionText: 'OK',
                            actionHandler: function () {
                            }
                        };
                        passwordr.messageSnackbar.show(data);
                    });
                }
                else {
                    var data = {
                        message: 'Password must be >= 8 characters long, and must have >= 1 one letter, >= 1 number, and >= 1 symbol.',
                        timeout: 2000,
                        actionText: 'OK',
                        actionHandler: function () {
                            passwordr.changeMasterPasswordDialog.show();
                        }
                    };
                    this.messageSnackbar.show(data);
                }
            }
            else {
                var data = {
                    message: 'Password and confirm password must match.',
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function () {
                        passwordr.changeMasterPasswordDialog.show();
                    }
                };
                this.messageSnackbar.show(data);
            }
        }
        else {
            var data = {
                message: 'Please provide a master password.',
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function () {
                    passwordr.changeMasterPasswordDialog.show();
                }
            };
            this.messageSnackbar.show(data);
        }
    }
    // import data from an XML file
    importXML() {
        // allow user to upload XML file
        var upload = document.createElement('input');
        upload.setAttribute('type', 'file');
        upload.onchange = function () {
            var reader = new FileReader();
            reader.onload = function () {
                var passwordsXML = new DOMParser().parseFromString(this.result, "text/xml");
                var passwords = document.evaluate('//password', passwordsXML, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
                var password = passwords.iterateNext();
                while (password) {
                    var name = document.evaluate('.//name', password, null, XPathResult.STRING_TYPE, null).stringValue;
                    var url = document.evaluate('.//url', password, null, XPathResult.STRING_TYPE, null).stringValue;
                    var passwordStr = document.evaluate('.//password_str', password, null, XPathResult.STRING_TYPE, null).stringValue;
                    var note = document.evaluate('.//note', password, null, XPathResult.STRING_TYPE, null).stringValue;
                    // add to Firebase
                    passwordr.encrypt(name, url, passwordStr, note, null);
                    // go to next password in XML
                    password = passwords.iterateNext();
                }
            };
            // read the XML file
            reader.readAsText(this.files[0]);
        };
        upload.click();
    }
    // import data from a KeePass XML file
    importKeePassXML() {
        // allow user to upload KeePass XML file
        var upload = document.createElement('input');
        upload.setAttribute('type', 'file');
        upload.onchange = function () {
            var reader = new FileReader();
            reader.onload = function () {
                var passwordsXML = new DOMParser().parseFromString(this.result, "text/xml");
                var passwords = document.evaluate('/KeePassFile/Root/Group/Group/Entry', passwordsXML, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
                var password = passwords.iterateNext();
                while (password) {
                    var nameNode = document.evaluate('./String[Key = "Title"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                    var name = document.evaluate('./Value', nameNode, null, XPathResult.STRING_TYPE, null).stringValue;
                    if (name == '') {
                        name = ' ';
                    }
                    var urlNode = document.evaluate('./String[Key = "URL"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                    var url = document.evaluate('./Value', urlNode, null, XPathResult.STRING_TYPE, null).stringValue;
                    if (url == '') {
                        url = ' ';
                    }
                    var passwordNode = document.evaluate('./String[Key = "Password"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                    var passwordStr = document.evaluate('./Value', passwordNode, null, XPathResult.STRING_TYPE, null).stringValue;
                    if (passwordStr == '') {
                        passwordStr = ' ';
                    }
                    var noteNode = document.evaluate('./String[Key = "Notes"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                    var note = document.evaluate('./Value', noteNode, null, XPathResult.STRING_TYPE, null).stringValue;
                    if (note == '') {
                        note = ' ';
                    }
                    // add to Firebase
                    passwordr.encrypt(name, url, passwordStr, note, null);
                    // go to next password in XML
                    password = passwords.iterateNext();
                }
            };
            // read the KeePass XML file
            reader.readAsText(this.files[0]);
        };
        upload.click();
    }
    // imports data from a JSON file
    importJSON() {
        // allow user to upload JSON file
        var upload = document.createElement('input');
        upload.setAttribute('type', 'file');
        upload.onchange = function () {
            var reader = new FileReader();
            reader.onload = function () {
                var passwordsJSON = JSON.parse(this.result);
                var password;
                for (password in passwordsJSON.passwords) {
                    // encrypt, and add to Firebase
                    var passwordObj = passwordsJSON.passwords[password];
                    passwordr.encrypt(passwordObj.name, passwordObj.url, passwordObj.password_str, passwordObj.note, null);
                }
            };
            // read the JSON file
            reader.readAsText(this.files[0]);
        };
        upload.click();
    }
    // export data to an XML file
    exportXML() {
        // create DOM tree
        var doc = document.implementation.createDocument("", "", null);
        var passwordsElem = doc.createElement("passwords");
        $('.password_template').each(function () {
            var passwordElem = doc.createElement("password");
            var nameElem = doc.createElement("name");
            nameElem.textContent = $(this).find('.name').text() == '' ? ' ' : $(this).find('.name').text();
            passwordElem.appendChild(nameElem);
            var urlElem = doc.createElement("url");
            urlElem.textContent = $(this).find('.url').text() == '' ? ' ' : $(this).find('.url').text();
            passwordElem.appendChild(urlElem);
            var passwordStrElem = doc.createElement("password_str");
            passwordStrElem.textContent = $(this).find('.password').text() == '' ? ' ' : $(this).find('.password').text();
            passwordElem.appendChild(passwordStrElem);
            var noteElem = doc.createElement("note");
            noteElem.textContent = $(this).find('.note').text() == '' ? ' ' : $(this).find('.note').text();
            passwordElem.appendChild(noteElem);
            passwordsElem.appendChild(passwordElem);
        });
        doc.appendChild(passwordsElem);
        // serialize to XML
        var oSerializer = new XMLSerializer();
        var sXML = oSerializer.serializeToString(doc);
        // download
        var link = document.createElement('a');
        var filename = 'passwords.xml';
        var bb = new Blob([sXML], { type: 'text/xml' });
        link.setAttribute('href', window.URL.createObjectURL(bb));
        link.setAttribute('download', filename);
        link.dataset.downloadurl = ['text/xml', link.download, link.href].join(':');
        link.draggable = true;
        link.classList.add('dragout');
        document.body.appendChild(link);
        link.click();
    }
    // converts a plaintext password into a hex SHA-1 hash
    getSHA1(password) {
        var shaObj = new jsSHA("SHA-1", "TEXT");
        shaObj.update(password);
        return shaObj.getHash("HEX");
    }
    // checks all passwords against PwnedPasswords API
    checkAllPwnedPasswords() {
        $('.password_template').each(function () {
            var passwordCard = $(this);
            var password = passwordCard.find('.password').text();
            var hashedPassword = passwordr.getSHA1(password);
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var matches = this.responseText.split('\n');
                    matches.forEach(function (match) {
                        if (hashedPassword + match.substring(0, match.indexOf(':')) == hashedPassword) {
                            passwordCard.css('background-color', 'red'); // pwned
                            return;
                        }
                        else {
                            numNonMatching++;
                        }
                    });
                    if (numNonMatching == matches.length) {
                        passwordCard.css('background-color', 'green'); // not pwned
                    }
                }
            };
            xhttp.open("GET", "https://api.pwnedpasswords.com/range/" + hashedPassword.substring(0, 5), true);
            xhttp.send();
        });
    }
    // export data to a JSON file
    exportJSON() {
        var passwords = '{"passwords":{';
        var passwordIndex = 0;
        $('.password_template').each(function () {
            passwords += '"password-' + passwordIndex + '":' +
                JSON.stringify({
                    name: $(this).find('.name').text() == '' ? ' ' : $(this).find('.name').text(),
                    url: $(this).find('.url').text() == '' ? ' ' : $(this).find('.url').text(),
                    password_str: $(this).find('.password').text() == '' ? ' ' : $(this).find('.password').text(),
                    note: $(this).find('.note').text() == '' ? ' ' : $(this).find('.note').text()
                }) +
                ",";
            passwordIndex++;
        });
        // remove trailing comma, and add closing braces
        passwords = passwords.substring(0, passwords.length - 1) + '}}';
        // download
        var link = document.createElement('a');
        var filename = 'passwords.json';
        var bb = new Blob([passwords], { type: 'application/json' });
        link.setAttribute('href', window.URL.createObjectURL(bb));
        link.setAttribute('download', filename);
        link.dataset.downloadurl = ['application/json', link.download, link.href].join(':');
        link.draggable = true;
        link.classList.add('dragout');
        document.body.appendChild(link);
        link.click();
    }
    // export data to a CSV file
    exportCSV() {
        var passwords = 'title,url,password,note\n';
        $('.password_template').each(function () {
            passwords += $(this).find('.name').text().replace(/\n/g, ' ').replace(/\"/g, '\\\"') + ',' +
                $(this).find('.url').text().replace(/\n/g, ' ').replace(/\"/g, '\\\"') + ',' +
                $(this).find('.password').text().replace(/\n/g, ' ').replace(/\"/g, '\\\"') + ',' +
                $(this).find('.note').text().replace(/\n/g, ' ').replace(/\"/g, '\\\"') + '\n';
        });
        // download
        var link = document.createElement('a');
        var filename = 'passwords.csv';
        var bb = new Blob([passwords], { type: 'text/csv' });
        link.setAttribute('href', window.URL.createObjectURL(bb));
        link.setAttribute('download', filename);
        link.dataset.downloadurl = ['text/csv', link.download, link.href].join(':');
        link.draggable = true;
        link.classList.add('dragout');
        document.body.appendChild(link);
        link.click();
    }
    // Decrypts a CSV field, and updates the specified element with the decrypted data
    decryptCSV(elem) {
        const ivLen = 12;
        var iv = new Int8Array(ivLen);
        var passwordr = this;
        if (elem.textContent != null) { // no jQuery
            var csv = elem.textContent.split(',');
        }
        else if (elem.text() != null) { // using jQuery
            var csv = elem.text().split(',');
        }

        if (csv.length != 1 || csv[0] != '') {
            for (var i = 0; i < ivLen; i++) {
                iv[i] = csv[i];
            }
            var data = new Int8Array(csv.length - ivLen);
            var dataIndex = 0;
            for (var i = ivLen; i < csv.length; i++) {
                data[dataIndex] = csv[i];
                dataIndex++;
            }
            window.crypto.subtle.decrypt({
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            }, passwordr.encryptionKey, data)
                .then(function (decrypted) {
                    if (elem.textContent != null) { // no jQuery
                        elem.textContent = new StringView(decrypted).toString();
                        elem.hidden = false; // un-hide
                    }
                    else { // jQuery
                        elem.text(new StringView(decrypted).toString());
                        elem.prop('hidden', false); // un-hide
                    }
                })
                .catch(function (err) {
                    if (!passwordr.decryptErrorShown) {
                        var data = {
                            message: 'Decryption error: ' + err,
                            timeout: 2000,
                            actionText: 'OK',
                            actionHandler: function () {
                            }
                        };
                        passwordr.messageSnackbar.show(data);
                        passwordr.decryptErrorShown = true;
                    }
                });
        }
    }
    // Reveals a hidden password
    revealPassword(passwordSection, revealBtn) {
        if (passwordSection.hidden != null) {
            passwordSection.hidden = false;
        }
        else {
            passwordSection.prop('hidden', false);
        }
        revealBtn.disabled = true;
    }
    // Returns true if user is signed-in. Otherwise false and displays a message.
    checkSignedIn() {
        // Check if user is signed in to Firebase
        if (this.auth.currentUser) {
            return true;
        }
        var data = {
            message: 'You must sign in first',
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function () {
            }
        };
        this.messageSnackbar.show(data);
        return false;
    }
    // Save changes to a password
    saveChanges(editBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key) {
        var newName = nameTextfield.querySelector('.mdc-textfield__input').value;
        var newUrl = urlTextfield.querySelector('.mdc-textfield__input').value;
        var newPassword = passwordSection.querySelector('.mdc-textfield__input').value;
        var newNote = noteSection.querySelector('.mdc-textfield__input').value;
        var passwordr = this;
        // if no changes were made, simply reset the fields, sections, and buttons
        if (nameHeader.textContent == newName && urlHeader.textContent == newUrl && oldPassword == newPassword && oldNote == newNote) {
            var textfields = nameTextfield.parentNode.querySelectorAll('.mdc-textfield');
            Array.prototype.forEach.call(textfields, function (textfield) {
                textfield.parentNode.removeChild(textfield);
            });
            nameTextfield.parentNode.appendChild(nameHeader);
            urlTextfield.parentNode.appendChild(urlHeader);
            passwordSection.removeChild(passwordSection.firstChild);
            passwordSection.textContent = newPassword;
            passwordSection.setAttribute('hidden', true); // hide the password
            noteSection.removeChild(noteSection.firstChild);
            noteSection.textContent = newNote;
            var newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', this.editPassword.bind(this, nameHeader, urlHeader, passwordSection, noteSection, newEditBtn, revealBtn, key));
            newEditBtn.textContent = "Edit";
            revealBtn.removeAttribute('disabled');
        }
        else {
            // Check that the user entered at least a name and password, and that the user is signed in
            if (newName != '' || newUrl != '') {
                if (newPassword.length >= 8 && newPassword.match(/[a-zA-Z]/) != null && newPassword.match(/\d+/g) != null && newPassword.match(/\W+/g) != null) {
                    // update Firebase
                    if (newName == '') {
                        newName = ' ';
                    }
                    if (newUrl == '') {
                        newUrl = ' ';
                    }
                    if (newNote == '') {
                        newNote = ' ';
                    }
                    passwordr.encrypt(newName, newUrl, newPassword, newNote, key);
                }
                else {
                    var data = {
                        message: 'Password must be >= 8 characters long, and must have >= 1 one letter, >= 1 number, and >= 1 symbol.',
                        timeout: 2000,
                        actionText: 'OK',
                        actionHandler: function () {
                        }
                    };
                    passwordr.messageSnackbar.show(data);
                }
            }
            else {
                var data = {
                    message: 'You must provide either a name or a URL.',
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function () {
                    }
                };
                passwordr.messageSnackbar.show(data);
            }
        }
    }
    // Edit a password
    editPassword(nameHeader, urlHeader, passwordSection, noteSection, editBtn, revealBtn, key) {
        editBtn.textContent = "Done";
        revealBtn.setAttribute('disabled', true); // disable reveal button while in edit mode
        // make name header editable
        var nameTextfield = document.createElement('div');
        nameTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
        nameTextfield.querySelector('.mdc-textfield__input').value = nameHeader.textContent;
        if (nameHeader.parentNode != null) {
            nameHeader.parentNode.appendChild(nameTextfield);
            nameHeader.parentNode.removeChild(nameHeader);
        }
        // make url header editable
        var urlTextfield = document.createElement('div');
        urlTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
        urlTextfield.querySelector('.mdc-textfield__input').value = urlHeader.textContent;
        if (urlHeader.parentNode != null) {
            urlHeader.parentNode.appendChild(urlTextfield);
            urlHeader.parentNode.removeChild(urlHeader);
        }
        var oldPassword = "";
        // make password section editable
        var passwordTextfield = document.createElement('div');
        passwordTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
        $(passwordTextfield).prop('id', 'add-existing-password-input');
        passwordSection.removeAttribute('hidden');
        oldPassword = passwordSection.textContent;
        passwordTextfield.querySelector('.mdc-textfield__input').value = oldPassword;
        passwordSection.textContent = "";
        passwordSection.appendChild(passwordTextfield);
        // add generate button
        var genBtn = document.createElement('button');
        $(genBtn).prop('type', 'button');
        $(genBtn).prop('id', 'generate-existing-password-button');
        $(genBtn).prop('class', 'mdc-button mdc-dialog__footer__button mdc-ripple-upgraded');
        $(genBtn).prop('style', '--mdc-ripple-surface-width:91.5156px; --mdc-ripple-surface-height:36px; --mdc-ripple-fg-size:54.9094px; --mdc-ripple-fg-scale:1.9731;');
        $(genBtn).text('Generate');
        // insert button between password input and bottom line
        var passwordTextfield = passwordSection.querySelector('div').querySelector('div');
        passwordTextfield.insertBefore(genBtn, passwordTextfield.lastChild);
        this.generateExistingPasswordButton = document.getElementById('generate-existing-password-button');
        this.generateExistingPasswordButton.addEventListener('click', passwordr.generatePassword.bind(this, passwordTextfield.querySelector('.mdc-textfield__input'), null));
        var oldNote = "";
        // make note section editable
        var noteTextfield = document.createElement('div');
        noteTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
        oldNote = noteSection.textContent;
        noteTextfield.querySelector('.mdc-textfield__input').value = oldNote;
        noteSection.textContent = "";
        noteSection.appendChild(noteTextfield);
        if (editBtn.parentNode != null) {
            // remove existing event listener, and add new event listener
            var newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', passwordr.saveChanges.bind(passwordr, newEditBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key));
        }
    }
    // attempt to delete a password
    deletePassword(key) {
        this.database.collection("passwords").doc(key).delete().then(function () {
            var data = {
                message: 'Remove succeeded.',
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function () {
                }
            };
            passwordr.messageSnackbar.show(data);
            passwordr.loadPasswords();
        });
    }
    // attempt to check a password against the Pwned Passwords API
    checkPwnedPassword(key) {
        $('.password_template').each(function () {
            var passwordCard = $(this);
            if (passwordCard.prop('id') == key) {
                var password = passwordCard.find('.password').text();
                var hashedPassword = passwordr.getSHA1(password);
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function () {
                    if (this.readyState == 4 && this.status == 200) {
                        var matches = this.responseText.split('\n');
                        var numNonMatching = 0;
                        matches.forEach(function (match) {
                            if (hashedPassword + match.substring(0, match.indexOf(':')) == hashedPassword) {
                                passwordCard.css('background-color', 'red'); // pwned
                                return;
                            }
                            else {
                                numNonMatching++;
                            }
                        });
                        if (numNonMatching == matches.length) {
                            passwordCard.css('background-color', 'green'); // not pwned
                        }
                    }
                };
                xhttp.open("GET", "https://api.pwnedpasswords.com/range/" + hashedPassword.substring(0, 5), true);
                xhttp.send();
            }
        });
    }
    // Actions that occur when a user clicks a password's "Delete" button
    deletePasswordButtonClicked(key) {
        if (passwordr.checkSignedIn()) {
            // show the confirm delete dialog
            passwordr.confirmDeletePasswordButton.addEventListener('click', passwordr.deletePassword.bind(this, key));
            passwordr.confirmDeletePasswordDialog.show();
        }
    }
    // Actions that occur when a user clicks a password's "Check" button
    checkPwnedPasswordButtonClicked(key) {
        if (passwordr.checkSignedIn()) {
            // show the confirm check password dialog
            passwordr.confirmCheckPwnedPasswordButton.addEventListener('click', passwordr.checkPwnedPassword.bind(this, key));
            passwordr.confirmCheckPwnedPasswordDialog.show();
        }
    }
    // Display a password in the UI
    displayPassword(key, name, url, password, note) {
        var div = document.getElementById(key);
        // If a card element for the password does not exist, create it
        if (!div) {
            var container = document.createElement('div');
            container.innerHTML = Passwordr.PASSWORD_TEMPLATE;
            div = container.firstChild;
            div.setAttribute('id', key);
            this.passwordList.appendChild(div);
        }
        // get fields
        var nameHeader = div.querySelector('.name');
        var urlHeader = div.querySelector('.url');
        var passwordSection = div.querySelector('.password');
        var noteSection = div.querySelector('.note');
        // if name & url fields are still editable (selectors will return null if this is the case), the password was modified
        var passwordChanged = nameHeader == null && urlHeader == null;
        if (passwordChanged) {
            // make headers uneditable
            var primarySection = div.querySelector('.mdc-card__primary');
            var textfields = primarySection.querySelectorAll('.mdc-textfield');
            Array.prototype.forEach.call(textfields, function (textfield) {
                textfield.parentNode.removeChild(textfield);
            });
            nameHeader = document.createElement('h1');
            nameHeader.setAttribute('class', 'name mdc-card__title mdc-card__title--large');
            primarySection.appendChild(nameHeader);
            urlHeader = document.createElement('h2');
            urlHeader.setAttribute('class', 'url mdc-card__subtitle');
            primarySection.appendChild(urlHeader);
        }
        nameHeader.textContent = name;
        urlHeader.textContent = url;
        passwordSection.textContent = password;
        noteSection.textContent = note;
        // hide password until user clicks "Show"
        passwordSection.hidden = true;
        if (this.encryptionKey != null) {
            // encryption key exists, so show fields
            this.decryptCSV(nameHeader);
            this.decryptCSV(urlHeader);
            this.decryptCSV(passwordSection);
            this.decryptCSV(noteSection);
        }
        else {
            // the page just loaded, so do the revealing in setMasterPassword
            nameHeader.hidden = true;
            urlHeader.hidden = true;
            noteSection.hidden = true;
        }
        // add event handlers to buttons
        var revealBtn = div.querySelector('.reveal');
        revealBtn.addEventListener('click', this.revealPassword.bind(this, passwordSection, revealBtn));
        // re-enable reveal button (if it was disabled)
        revealBtn.removeAttribute('disabled');
        var editBtn = div.querySelector('.edit');
        if (passwordChanged) {
            // change "Done" button back to "Edit" button
            var newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', this.editPassword.bind(this, nameHeader, urlHeader, passwordSection, noteSection, newEditBtn, revealBtn, key));
            newEditBtn.textContent = "Edit";
        }
        else {
            editBtn.addEventListener('click', this.editPassword.bind(this, nameHeader, urlHeader, passwordSection, noteSection, editBtn, revealBtn, key));
        }
        // re-attach event listener to delete button
        var deleteBtn = div.querySelector('.delete');
        var newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', this.deletePasswordButtonClicked.bind(this, key));
    }
    // Loads passwords
    loadPasswords() {
        this.newPasswordButton.removeAttribute('disabled');
        // get all passwords that belong to user
        this.passwordsRef = this.database.collection("passwords").where("userid", "==", this.auth.currentUser.uid);
        // Remove old snapshot listener
        var unsubscribe = this.passwordsRef.onSnapshot(function () { });
        unsubscribe();
        // Change handlers
        var setPassword = function (data) {
            var val = data.data();
            this.displayPassword(data.id, val.name, val.url, val.password, val.note);
        }.bind(this);
        var removePasswordFromUI = function (data) {
            var div = document.getElementById(data.id);
            if (div != null) {
                div.parentNode.removeChild(div);
            }
        }.bind(this);
        this.passwordsRef.onSnapshot(function (snapshot) {
            snapshot.docChanges.forEach(function (change) {
                if (change.type === 'added' || change.type === 'modified') {
                    setPassword(change.doc);
                }
                else if (change.type === 'removed') {
                    removePasswordFromUI(change.doc);
                }
            });
        });
    }
    // Triggers when the user signs in or signs out
    onAuthStateChanged(user) {
        if (user) { // User is signed in
            // Get profile pic and user's name from the Firebase user object
            var profilePicUrl = user.photoURL;
            var userName = user.displayName;
            user.getIdToken().then(function (accessToken) {
                // Set the user's profile pic and name
                this.userPic.setAttribute('src', profilePicUrl);
                this.userName.textContent = userName;
                // Show user's profile and sign-out button
                this.userName.removeAttribute('hidden');
                this.userPic.removeAttribute('hidden');
                this.signOutButton.removeAttribute('disabled');
                $('#firebaseui-auth-container').prop('hidden', true);
                // get master password
                this.masterPasswordDialog.show();
                this.loadPasswords();
            }.bind(this));
        }
        else { // User is signed out
            // Hide user's profile, and disable sign-out button
            this.userName.setAttribute('hidden', true);
            this.userPic.removeAttribute('src');
            this.signOutButton.setAttribute('disabled', true);
            $('#firebaseui-auth-container').prop('hidden', false);
            // remove passwords from list
            while (this.passwordList.hasChildNodes()) {
                this.passwordList.removeChild(this.passwordList.lastChild);
            }
        }
    }
};

// Template for passwords
Passwordr.PASSWORD_TEMPLATE =
'<div class="mdc-card password_template">' +
    '<section class="mdc-card__primary">' +
        '<h1 class="name mdc-card__title mdc-card__title--large"></h1>' +
        '<h2 class="url mdc-card__subtitle"></h2>' +
    '</section>' +
    '<section class="password mdc-card__supporting-text"></section>' +
    '<section class="note mdc-card__supporting-text"></section>' +    
    '<section class="mdc-card__actions">' +
        '<button class="reveal mdc-button mdc-button--compact mdc-card__action">Show</button>' +    
        '<button class="edit mdc-button mdc-button--compact mdc-card__action">Edit</button>' +
        '<button class="delete mdc-button mdc-button--compact mdc-card__action">Delete</button>' +
        '<button class="check mdc-button mdc-button--compact mdc-card__action">Check</button>' +
    '</section>' +
'</div>';

// Template for name/url/password/note textfield
Passwordr.TEXTFIELD_TEMPLATE = 
'<div class="mdc-textfield">' +
  '<input type="text" class="mdc-textfield__input">' +
  '<div class="mdc-textfield__bottom-line"></div>' +
'</div>'

window.onload = function() {
    window.passwordr = new Passwordr();
};
