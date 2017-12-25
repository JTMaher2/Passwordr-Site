'use strict';

const MDCSnackbar = mdc.snackbar.MDCSnackbar;
const MDCDialog = mdc.dialog.MDCDialog;

// Initializes Passwordr
function Passwordr() {
    this.checkSetup();

    // Shortcuts to DOM elements
    this.passwordList = document.getElementById('passwords');    
    //this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.changeMasterPasswordButton = document.getElementById('change-master-password');
    this.importExportDataButton = document.getElementById('import-export-data-button');  
    this.importXMLButton = document.getElementById('import-xml-button');
    this.importJSONButton = document.getElementById('import-json-button');
    this.importKeePassXMLButton = document.getElementById('import-keepass-xml-button');    
    this.exportXMLButton = document.getElementById('export-xml-button');
    this.exportJSONButton = document.getElementById('export-json-button');    
    this.newPasswordButton = document.getElementById('new-password');
    this.generatePasswordButton = document.getElementById('generate-password-button');
    this.confirmDeletePasswordButton = document.getElementById('confirm-delete-password-button');    
    
    this.userPic = document.getElementById('user-pic');    
    this.userName = document.getElementById('user-name');    
    this.messageSnackbar = new MDCSnackbar(document.getElementById('message-snackbar'));
    this.newPasswordDialog = new MDCDialog(document.getElementById('new-password-dialog'));
    this.masterPasswordDialog = new MDCDialog(document.getElementById('master-password-dialog'));
    this.changeMasterPasswordDialog = new MDCDialog(document.getElementById('change-master-password-dialog'));
    this.importExportDataDialog = new MDCDialog(document.getElementById('import-export-data-dialog'));
    this.confirmDeletePasswordDialog = new MDCDialog(document.getElementById('confirm-delete-password-dialog'));

    var passwordr = this;    
    this.newPasswordDialog.listen('MDCDialog:accept', function() {
        passwordr.newPassword();
    });
    this.masterPasswordDialog.listen('MDCDialog:accept', function() {
        passwordr.setMasterPassword();
    });
    this.changeMasterPasswordDialog.listen('MDCDialog:accept', function() {
        passwordr.changeMasterPassword();
    });

    //this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.changeMasterPasswordButton.addEventListener('click', function (evt) {
        passwordr.changeMasterPasswordDialog.lastFocusedTarget = evt.target;
        passwordr.changeMasterPasswordDialog.show();
    });
    this.importExportDataButton.addEventListener('click', function (evt) {
        passwordr.importExportDataDialog.lastFocusedTarget = evt.target;
        passwordr.importExportDataDialog.show();
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

    this.generatePasswordButton.addEventListener('click', this.generatePassword.bind(this));
    this.importXMLButton.addEventListener('click', this.importXML.bind(this));
    this.importJSONButton.addEventListener('click', this.importJSON.bind(this));    
    this.importKeePassXMLButton.addEventListener('click', this.importKeePassXML.bind(this));    
    this.exportXMLButton.addEventListener('click', this.exportXML.bind(this));
    this.exportJSONButton.addEventListener('click', this.exportJSON.bind(this));

    this.initFirebase();
};

// Checks that the Firebase SDK has been correctly setup and configured
Passwordr.prototype.checkSetup = function() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK.');
    }
};

// Sets up shortcuts to Firebase features, and initiates Firebase Auth
Passwordr.prototype.initFirebase = function() {
    // Shortcuts to Firebase SDK features
    this.auth = firebase.auth();
   // this.ui = new firebaseui.auth.AuthUI(this.auth);
    
    this.database = firebase.firestore();
    
    // Initiate Firebase Auth, and listen to auth state changes
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Signs-in to Passwordr
Passwordr.prototype.signIn = function() {
    // Sign in to Firebase using popup auth and Google as the identity provider
    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider).then(function(result) {
        console.log(result.credential.accessToken);
        console.log(result.user);
    }.bind(this));
};

// Signs-out of Passwordr
Passwordr.prototype.signOut = function() {
    // Sign out of Firebase
    this.auth.signOut().then(function() {
        // Enable sign-in button
        ui.start('#firebaseui-auth-container', uiConfig); // adjust Firebase Auth UI
    }).catch(function(error) {
        console.log("Error: " + error);
    });
};

// generates a random password
Passwordr.prototype.generatePassword = function () {
    const length = 20;
    var string = "abcdefghijklmnopqrstuvwxyz"; //to upper 
    var numeric = '0123456789';
    var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
    var password = "";
    var character = "";
    var crunch = true;
    while( password.length<length ) {
        var entity1 = Math.ceil(string.length * Math.random()*Math.random());
        var entity2 = Math.ceil(numeric.length * Math.random()*Math.random());
        var entity3 = Math.ceil(punctuation.length * Math.random()*Math.random());
        var hold = string.charAt( entity1 );
        hold = (entity1%2==0)?(hold.toUpperCase()):(hold);
        character += hold;
        character += numeric.charAt( entity2 );
        character += punctuation.charAt( entity3 );
        password = character;
    }
    
    // populate the password and confirm password fields with the random password
    $('#add-password-input').val(password);
    $('#add-confirm-password-input').val(password);
};

// convert an ArrayBuffer into CSV format
Passwordr.prototype.bufferToCSV = function(buffer, length) {
    var csv = '';

    for (var i = 0; i < length - 1; i++) {
        csv += buffer[i] + ',';
    }

    csv += buffer[length - 1];

    return csv;
}

// Encrypt a string using AES-GCM
Passwordr.prototype.encrypt = function(name, url, password, note, key) {
    var passwordr = this;
    
    // name
    var nameIV = window.crypto.getRandomValues(new Uint8Array(12));    
    window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",

            iv: nameIV,

            tagLength: 128
        },
        passwordr.encryptionKey,
        //passwordr.encoder.encode(name).buffer
        new StringView(name).buffer
    ).then(function(encryptedName) {
        // URL
        var urlIV = window.crypto.getRandomValues(new Uint8Array(12));
        window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
    
                iv: urlIV,
    
                tagLength: 128
            },
            passwordr.encryptionKey,
            //passwordr.encoder.encode(url).buffer
            new StringView(url).buffer
        ).then(function(encryptedUrl) {
            // password
            var passwordIV = window.crypto.getRandomValues(new Uint8Array(12));            
            window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
        
                    iv: passwordIV,
        
                    tagLength: 128
                },
                passwordr.encryptionKey,
                new StringView(password).buffer
            ).then(function(encryptedPassword) {
                // note
                var noteIV = window.crypto.getRandomValues(new Uint8Array(12));                
                window.crypto.subtle.encrypt(
                    {
                        name: "AES-GCM",
            
                        iv: noteIV,
            
                        tagLength: 128
                    },
                    passwordr.encryptionKey,
                    new StringView(note).buffer
                ).then(function(encryptedNote) {                    
                    var encryptedEncodedName = new Uint8Array(encryptedName);
                    var encryptedEncodedUrl = new Uint8Array(encryptedUrl);
                    var encryptedEncodedPassword = new Uint8Array(encryptedPassword);
                    var encryptedEncodedNote = new Uint8Array(encryptedNote);

                    var nameWithIV = passwordr.bufferToCSV(nameIV, nameIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedName, encryptedEncodedName.length);
                    var urlWithIV = passwordr.bufferToCSV(urlIV, urlIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedUrl, encryptedEncodedUrl.length);
                    var passwordWithIV = passwordr.bufferToCSV(passwordIV, passwordIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedPassword, encryptedEncodedPassword.length);
                    var noteWithIV = passwordr.bufferToCSV(noteIV, noteIV.length) + ',' + passwordr.bufferToCSV(encryptedEncodedNote, encryptedEncodedNote.length);

                    // if this is a new password, there won't be a key
                    if (key == null) {
                        passwordr.passwordsRef.add({
                            name: nameWithIV,
                            url: urlWithIV,
                            password: passwordWithIV,
                            note: noteWithIV,
                            userid: passwordr.auth.currentUser.uid
                        }).catch(function(error) {
                            var data = {
                                message: 'Error adding password: ' + error,
                                timeout: 2000,
                                actionText: 'OK',
                                actionHandler: function() {
                                }
                            };
                            passwordr.messageSnackbar.show(data);
                        });
                    } else { // it's an existing password
                        passwordr.passwordsRef.doc(key).update({
                            name: nameWithIV,
                            url: urlWithIV,
                            password: passwordWithIV,
                            note: noteWithIV
                        })
                        .catch(function(error) {
                            var data = {
                                message: 'Error modifying password: ' + error,
                                timeout: 2000,
                                actionText: 'OK',
                                actionHandler: function() {
                                }
                            };
                            passwordr.messageSnackbar.show(data);
                        });
                    }
                }).catch(function(error) {
                    var data = {
                        message: 'Error encrypting note: ' + error,
                        timeout: 2000,
                        actionText: 'OK',
                        actionHandler: function() {
                        }
                    };
                    passwordr.messageSnackbar.show(data);
                });
            }).catch(function(error) {
                var data = {
                    message: 'Error encrypting password: ' + error,
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function() {
                    }
                };
                passwordr.messageSnackbar.show(data);
            });

        }).catch(function(err) {
            var data = {
                message: 'Error encrypting URL: ' + err,
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function() {
                }
            };
            passwordr.messageSnackbar.show(data);
        });
    }).catch(function(err) {
        var data = {
            message: 'Error encrypting name: ' + error,
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
            }
        };
        passwordr.messageSnackbar.show(data);
    });
};

// Add a new password to the database
Passwordr.prototype.newPassword = function() {
    if (this.checkSignedIn()) {
        var name = document.getElementById('add-name-input').value;
        var url = document.getElementById('add-url-input').value;
        var password = document.getElementById('add-password-input').value;
        var confirmPassword = document.getElementById('add-confirm-password-input').value;
        var note = document.getElementById('add-note-input').value;
        
        if (password == confirmPassword) {
            this.encrypt(name, url, password, note, null); // do not provide a key
        } else {
            var data = {
                message: 'Password must match confirm password',
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function() {
                }
            };
            this.messageSnackbar.show(data);
        }
    }
};

Passwordr.prototype.setMasterPassword = function() {
    var passwordr = this;

    if ($('#master-password').val() != null) {
        window.crypto.subtle.importKey(
            'raw',
            new StringView($('#master-password').val()).buffer,
            'HKDF',
            false,
            ['deriveKey']
        ).then(function(key) {
            window.crypto.subtle.deriveKey(
                {
                    name: 'HKDF',
                    salt: new Uint8Array(),
                    info: new StringView('encryption').buffer,
                    hash: 'SHA-256'
                },
                key,
                {
                    name: 'AES-GCM',
                    length: 128
                },
                false,
                ['encrypt', 'decrypt']
            ).then(function(derived) {
                passwordr.encryptionKey = derived;

                // decrypt and show all fields
                $('.password_template').each(function() {
                    var current_password = $(this);

                    var nameHeader = current_password.find('.name');                    
                    passwordr.decryptCSV(nameHeader);
                    nameHeader.prop('hidden', false);

                    var urlHeader = current_password.find('.url');
                    passwordr.decryptCSV(urlHeader);
                    urlHeader.prop('hidden', false);

                    var passwordSection = current_password.find('.password');
                    passwordr.decryptCSV(passwordSection);
                    passwordSection.prop('hidden', true);

                    var noteSection = current_password.find('.note');                    
                    passwordr.decryptCSV(noteSection);
                    noteSection.prop('hidden', false);  
                });
            }).catch(function(err) {
                var data = {
                    message: 'Derivation error: ' + err,
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function() {
                    }
                };
                passwordr.messageSnackbar.show(data);
            });
        }).catch(function(err) {
            var data = {
                message: 'Import error: ' + err,
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function() {
                }
            };
            passwordr.messageSnackbar.show(data);
        });
    } else {
        var data = {
            message: 'Please provide a master password.',
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
                passwordr.masterPasswordDialog.show();
            }
        };
        this.messageSnackbar.show(data);
    }
};

// changes a user's master password
Passwordr.prototype.changeMasterPassword = function() {
    var passwordr = this;

    var masterPassword = $('#new-master-password');
    var confirmMasterPassword = $('#confirm-new-master-password');

    if (masterPassword.val() != null) {
        if (masterPassword.val() == confirmMasterPassword.val()) {
            window.crypto.subtle.importKey(
                'raw',
                new StringView(masterPassword.val()).buffer,
                'HKDF',
                false,
                ['deriveKey']
            ).then(function(key) {
                window.crypto.subtle.deriveKey(
                    {
                        name: 'HKDF',
                        salt: new Uint8Array(),
                        info: new StringView('encryption').buffer,
                        hash: 'SHA-256'
                    },
                    key,
                    {
                        name: 'AES-GCM',
                        length: 128
                    },
                    false,
                    ['encrypt', 'decrypt']
                ).then(function(derived) {
                    passwordr.encryptionKey = derived;
                    
                    // re-encrypt all fields
                    $('.password_template').each(function() {
                        var current_password = $(this);

                        var nameHeader = current_password.find('.name');
                        var urlHeader = current_password.find('.url'); 
                        var noteSection = current_password.find('.note');
                        var passwordSection = current_password.find('.password');

                        // re-encrypt it
                        passwordr.encrypt(nameHeader.text(), urlHeader.text(), passwordSection.text(), noteSection.text(), current_password.attr('id')); // the id is the key                  
                    });

                    window.location.reload(); // refresh the page
                }).catch(function(err) {
                    var data = {
                        message: 'Derivation error: ' + err,
                        timeout: 2000,
                        actionText: 'OK',
                        actionHandler: function() {
                        }
                    };
                    passwordr.messageSnackbar.show(data);
                });
            }).catch(function(err) {
                var data = {
                    message: 'Import error: ' + err,
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function() {
                    }
                };
                passwordr.messageSnackbar.show(data);
            });
        } else {
            var data = {
                message: 'Password and confirm password must match.',
                timeout: 2000,
                actionText: 'OK',
                actionHandler: function() {
                    passwordr.changeMasterPasswordDialog.show();
                }
            };
            this.messageSnackbar.show(data);
        }
    } else {
        var data = {
            message: 'Please provide a master password.',
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
                passwordr.changeMasterPasswordDialog.show();
            }
        };
        this.messageSnackbar.show(data);
    }
};

// import data from an XML file
Passwordr.prototype.importXML = function() {
    // allow user to upload XML file
    var upload = document.createElement('input');
    upload.setAttribute('type', 'file');
    upload.onchange = function () {
        var reader = new FileReader();
        reader.onload = function() {
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
};

// import data from a KeePass XML file
Passwordr.prototype.importKeePassXML = function() {
    // allow user to upload KeePass XML file
    var upload = document.createElement('input');
    upload.setAttribute('type', 'file');
    upload.onchange = function () {
        var reader = new FileReader();
        reader.onload = function() {
            var passwordsXML = new DOMParser().parseFromString(this.result, "text/xml");
            
            var passwords = document.evaluate('/KeePassFile/Root/Group/Group/Entry', passwordsXML, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
            
            var password = passwords.iterateNext();

            while (password) {
                var nameNode = document.evaluate('./String[Key = "Title"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                var name = document.evaluate('./Value', nameNode, null, XPathResult.STRING_TYPE, null).stringValue;
                
                var urlNode = document.evaluate('./String[Key = "URL"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                var url = document.evaluate('./Value', urlNode, null, XPathResult.STRING_TYPE, null).stringValue;

                var passwordNode = document.evaluate('./String[Key = "Password"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                var passwordStr = document.evaluate('./Value', passwordNode, null, XPathResult.STRING_TYPE, null).stringValue;
                
                var noteNode = document.evaluate('./String[Key = "Notes"]', password, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
                var note = document.evaluate('./Value', noteNode, null, XPathResult.STRING_TYPE, null).stringValue;
                
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
Passwordr.prototype.importJSON = function() {
    // allow user to upload JSON file
    var upload = document.createElement('input');
    upload.setAttribute('type', 'file');
    upload.onchange = function () {
        var reader = new FileReader();
        reader.onload = function() {
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
};

// export data to an XML file
Passwordr.prototype.exportXML = function() {
    // create DOM tree
    var doc = document.implementation.createDocument("", "", null);
    var passwordsElem = doc.createElement("passwords");

    $('.password_template').each(function() {
        var passwordElem = doc.createElement("password");
        var nameElem = doc.createElement("name");
        nameElem.textContent = $(this).find('.name').text();
        passwordElem.appendChild(nameElem);
        var urlElem = doc.createElement("url");
        urlElem.textContent = $(this).find('.url').text();
        passwordElem.appendChild(urlElem);
        var passwordStrElem = doc.createElement("password_str");
        passwordStrElem.textContent = $(this).find('.password').text();
        passwordElem.appendChild(passwordStrElem);
        var noteElem = doc.createElement("note");
        noteElem.textContent = $(this).find('.note').text();
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
    var bb = new Blob([sXML], {type: 'text/plain'});

    link.setAttribute('href', window.URL.createObjectURL(bb));
    link.setAttribute('download', filename);

    link.dataset.downloadurl = ['text/plain', link.download, link.href].join(':');
    link.draggable = true;
    link.classList.add('dragout');

    link.click();
};

// export data to a JSON file
Passwordr.prototype.exportJSON = function() {
    var passwords = '{"passwords":{';
    var passwordIndex = 0;

    $('.password_template').each(function() {
        passwords += '"password-' + passwordIndex + '":' +
            JSON.stringify({
                name: $(this).find('.name').text(),
                url: $(this).find('.url').text(),
                password_str:  $(this).find('.password').text(),
                note: $(this).find('.note').text()
            }) +
        ",";

        passwordIndex++;
    });

    // remove trailing comma, and add closing braces
    passwords = passwords.substring(0, passwords.length - 1) + '}}';

    // download
    var link = document.createElement('a');
    var filename = 'passwords.json';
    var bb = new Blob([passwords], {type: 'text/plain'});

    link.setAttribute('href', window.URL.createObjectURL(bb));
    link.setAttribute('download', filename);

    link.dataset.downloadurl = ['text/plain', link.download, link.href].join(':');
    link.draggable = true;
    link.classList.add('dragout');

    link.click();
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
    '</section>' +
'</div>';

// Template for name/url/password/note textfield
Passwordr.TEXTFIELD_TEMPLATE = 
'<div class="mdc-textfield">' +
  '<input type="text" class="mdc-textfield__input">' +
  '<div class="mdc-textfield__bottom-line"></div>' +
'</div>'

// Decrypts a CSV field, and updates the specified element with the decrypted data
Passwordr.prototype.decryptCSV = function(elem) {
    const ivLen = 12;
    var iv = new Uint8Array(ivLen);
    var passwordr = this;
    if (elem.textContent != null) { // no jQuery
        var csv = elem.textContent.split(',');        
    } else { // using jQuery
        var csv = elem.text().split(',');
    }

    for (var i = 0; i < ivLen; i++) {
        iv[i] = csv[i];
    }

    var data = new Uint8Array(csv.length - ivLen);

    var dataIndex = 0;
    for (var i = ivLen; i < csv.length; i++) {
        data[dataIndex] = csv[i];
        dataIndex++;
    }

    window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
            tagLength: 128
        },
        passwordr.encryptionKey,
        data
    )
    .then(function(decrypted) {
        if (elem.textContent != null) { // no jQuery
            elem.textContent = new StringView(decrypted).toString();           
        } else { // jQuery
            elem.text(new StringView(decrypted).toString());                      
        }
    })
    .catch(function(err) {
        var data = {
            message: 'Decryption error: ' + err,
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
            }
        };
        passwordr.messageSnackbar.show(data);
    });
};

// Reveals a hidden password
Passwordr.prototype.revealPassword = function(passwordSection, revealBtn) {
    passwordSection.hidden = false;
    revealBtn.disabled = true;
};

// Returns true if user is signed-in. Otherwise false and displays a message.
Passwordr.prototype.checkSignedIn = function() {
    // Check if user is signed in to Firebase
    if (this.auth.currentUser) {
        return true;
    }

    var data = {
        message: 'You must sign in first',
        timeout: 2000,
        actionText: 'OK',
        actionHandler: function() {
        }
    };
    this.messageSnackbar.show(data);
    return false;
};

// Save changes to a password
Passwordr.prototype.saveChanges = function(editBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key) {
    var newName = nameTextfield.querySelector('.mdc-textfield__input').value;
    var newUrl = urlTextfield.querySelector('.mdc-textfield__input').value;
    var newPassword = passwordSection.querySelector('.mdc-textfield__input').value;    
    var newNote = noteSection.querySelector('.mdc-textfield__input').value;
    var passwordr = this;
    // if no changes were made, simply reset the fields, sections, and buttons
    if (nameHeader.textContent == newName && urlHeader.textContent == newUrl && oldPassword == newPassword && oldNote == newNote) {
        var textfields = nameTextfield.parentNode.querySelectorAll('.mdc-textfield');
        Array.prototype.forEach.call( textfields, function( textfield ) {
            textfield.parentNode.removeChild( textfield );
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
    } else {
        // Check that the user entered at least a name and password, and that the user is signed in
        if (newName.length > 0 && newPassword.length > 0 && this.checkSignedIn()) {
            // update Firebase
            passwordr.encrypt(newName, newUrl, newPassword, newNote, key);
        } else {
            if (newName.length == 0) {
                var data = {
                    message: 'Name is required',
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function() {
                    }
                };
                passwordr.messageSnackbar.show(data);
            }
            if (newPassword.length == 0) {
                var data = {
                    message: 'Password is required',
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function() {
                    }
                };
                passwordr.messageSnackbar.show(data);
            }
        }
    }
};

// Edit a password
Passwordr.prototype.editPassword = function(nameHeader, urlHeader, passwordSection, noteSection, editBtn, revealBtn, key) {
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
    passwordSection.removeAttribute('hidden'); // reveal password
    oldPassword = passwordSection.textContent;
    passwordTextfield.querySelector('.mdc-textfield__input').value = oldPassword;
    passwordSection.textContent = "";
    passwordSection.appendChild(passwordTextfield);

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
        newEditBtn.addEventListener('click', this.saveChanges.bind(this, newEditBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key));
    }
};

// attempt to delete a password
Passwordr.prototype.deletePassword = function(key) {
    this.database.collection("passwords").doc(key).delete().then(function() {
        var data = {
            message: 'Remove succeeded.',
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
            }
        };
        passwordr.messageSnackbar.show(data);
        passwordr.loadPasswords();
    })
    .catch(function(error) {
        var data = {
            message: "Remove failed: " + error.message,
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
            }
        };
        passwordr.messageSnackbar.show(data);
    });
};

// Actions that occur when a user clicks a password's "Delete" button
Passwordr.prototype.deletePasswordButtonClicked = function(key) {
    if (this.checkSignedIn()) {
        // show the confirm delete dialog
        this.confirmDeletePasswordButton.addEventListener('click', this.deletePassword.bind(this, key));
        this.confirmDeletePasswordDialog.show();
    }   
};

// Display a password in the UI
Passwordr.prototype.displayPassword = function(key, name, url, password, note) {
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
        Array.prototype.forEach.call( textfields, function( textfield ) {
            textfield.parentNode.removeChild( textfield );
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
        nameHeader.hidden = false;
        this.decryptCSV(urlHeader);
        urlHeader.hidden = false;
        this.decryptCSV(passwordSection);
        this.decryptCSV(noteSection);
        noteSection.hidden = false;
    } else {
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
};

// Loads passwords
Passwordr.prototype.loadPasswords = function() {
    this.newPasswordButton.removeAttribute('disabled');

    // get all passwords that belong to user
    this.passwordsRef = this.database.collection("passwords").where("userid", "==", this.auth.currentUser.uid);
    
    // Remove old snapshot listener
    var unsubscribe = this.passwordsRef.onSnapshot(function () {});
    unsubscribe();
        
    // Change handlers
    var setPassword = function(data) {
        var val = data.data();
        this.displayPassword(data.id, val.name, val.url, val.password, val.note);
    }.bind(this);

    var removePasswordFromUI = function(data) {
        var div = document.getElementById(data.id);
        if (div != null) {
            div.parentNode.removeChild(div);
        }
    }.bind(this);

    this.passwordsRef.onSnapshot(function (snapshot) {
        snapshot.docChanges.forEach(function(change) {
            if (change.type === 'added' || change.type === 'modified') {
                setPassword(change.doc);
            } else if (change.type === 'removed') {
                removePasswordFromUI(change.doc);
            }
        });
    });
};

// Triggers when the user signs in or signs out
Passwordr.prototype.onAuthStateChanged = function(user) {
    if (user) { // User is signed in
        // Get profile pic and user's name from the Firebase user object
        var profilePicUrl = user.photoURL;
        var userName = user.displayName;

        user.getIdToken().then(function(accessToken) {
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
    } else { // User is signed out
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
};

window.onload = function() {
    window.passwordr = new Passwordr();
};  