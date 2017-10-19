'use strict';

const MDCSnackbar = mdc.snackbar.MDCSnackbar;
const MDCDialog = mdc.dialog.MDCDialog;

// Initializes Passwordr
function Passwordr() {
    this.checkSetup();

    // Shortcuts to DOM elements
    this.passwordList = document.getElementById('passwords');    
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.newPasswordButton = document.getElementById('new-password');      
    this.userPic = document.getElementById('user-pic');    
    this.userName = document.getElementById('user-name');    
    this.messageSnackbar = new MDCSnackbar(document.getElementById('message-snackbar'));
    this.newPasswordDialog = new MDCDialog(document.getElementById('new-password-dialog'));
    this.masterPasswordDialog = new MDCDialog(document.getElementById('master-password-dialog'));
    
    var passwordr = this;    
    this.newPasswordDialog.listen('MDCDialog:accept', function() {
        passwordr.newPassword();
    });
    this.masterPasswordDialog.listen('MDCDialog:accept', function() {
        passwordr.setMasterPassword();
    });

    this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));

    this.newPasswordButton.addEventListener('click', function (evt) {
        passwordr.newPasswordDialog.lastFocusedTarget = evt.target;
        passwordr.newPasswordDialog.show();
    });

    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();

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
    this.database = firebase./*database()*/firestore();
    
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
    this.auth.signOut();
};

// used for password generation
Passwordr.prototype.getRandomInt = function (min, max) {
    // Create byte array and fill with 1 random number
    var byteArray = new Uint8Array(1);
    window.crypto.getRandomValues(byteArray);

    var range = max - min + 1;
    var max_range = 256;
    if (byteArray[0] >= Math.floor(max_range / range) * range)
        return getRandomInt(min, max);
    return min + (byteArray[0] % range);
};

// Encode a unicode string to base-64
Passwordr.prototype.b64EncodeUnicode = function(string) {
    return btoa(encodeURIComponent(string).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
};

// Encrypt a string using AES-GCM
Passwordr.prototype.encrypt = function(name, url, password, note) {
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
        passwordr.encoder.encode(name).buffer
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
            passwordr.encoder.encode(url).buffer
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
                passwordr.encoder.encode(password).buffer
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
                    passwordr.encoder.encode(note).buffer
                ).then(function(encryptedNote) {
                    // update Firebase
                    passwordr.passwordsRef.add({
                        name: passwordr.b64EncodeUnicode(passwordr.decoder.decode(nameIV)) + ' ' + passwordr.b64EncodeUnicode(passwordr.decoder.decode(encryptedName)),
                        url: passwordr.b64EncodeUnicode(passwordr.decoder.decode(urlIV)) + ' ' + passwordr.b64EncodeUnicode(passwordr.decoder.decode(encryptedUrl)),
                        password: passwordr.b64EncodeUnicode(passwordr.decoder.decode(passwordIV)) + ' ' + passwordr.b64EncodeUnicode(passwordr.decoder.decode(encryptedPassword)),
                        note: passwordr.b64EncodeUnicode(passwordr.decoder.decode(noteIV)) + ' ' + passwordr.b64EncodeUnicode(passwordr.decoder.decode(encryptedNote)),
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
            this.encrypt(name, url, password, note);
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
        this.encryptionKey = window.crypto.subtle.importKey(
            'raw',
            passwordr.encoder.encode($('#master-password').val()).buffer,
            'HKDF',
            false,
            ['deriveKey']
        ).then(function(key) {
            window.crypto.subtle.deriveKey(
                {
                    name: 'HKDF',
                    salt: new Uint8Array(),
                    info: passwordr.encoder.encode('encryption').buffer,
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

// Template for passwords
Passwordr.PASSWORD_TEMPLATE =
'<div class="mdc-card">' +
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

// Decode a base64 encoded unicode string
Passwordr.prototype.b64DecodeUnicode = function(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
};

// Decrypt and reveal an encrypted and hidden password
Passwordr.prototype.revealPassword = function(passwordSection, revealBtn) {
    var passwordr = this;

    window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            // IV is up to 40 characters before first space
            iv: passwordr.encoder.encode(passwordr.b64DecodeUnicode(passwordSection.textContent.substring(0, passwordSection.textContent.indexOf(' ')))).buffer,
            tagLength: 128
        },
        passwordr.encryptionKey,
        // password is all characters after the space
        passwordr.encoder.encode(passwordr.b64DecodeUnicode(passwordSection.textContent.substring(passwordSection.textContent.indexOf(' ') + 1))).buffer
    )
    .then(function(decrypted) {
        passwordSection.textContent = passwordr.decoder.decode(decrypted);
        passwordSection.removeAttribute('hidden');
        revealBtn.disabled = true;
    })
    .catch(function(err) {
        var data = {
            message: 'Decryption error: ' + err,
            timeout: 2000,
            actionText: 'OK',
            actionHandler: function() {
                passwordr.masterPasswordDialog.show();
            }
        };
        passwordr.messageSnackbar.show(data);
    });
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
        passwordSection.setAttribute('hidden', 'true'); // hide the password
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
            this.passwordsRef.doc(key).update({
                name: newName,
                url: newUrl,
                password: newPassword,
                note: newNote
            })
            .then(function() {
                passwordr.displayPassword(key, newName, newUrl, newPassword, newNote);           
            })
            .catch(function(error) {
                var data = {
                    message: 'Error saving password: ' + error,
                    timeout: 2000,
                    actionText: 'OK',
                    actionHandler: function() {
                    }
                };
                passwordr.messageSnackbar.show(data);
            });
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
    revealBtn.setAttribute('disabled', 'true'); // disable reveal button while in edit mode

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
    if (passwordSection.textContent != "") {
        // make password section editable
        var passwordTextfield = document.createElement('div');
        passwordTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
        passwordSection.removeAttribute('hidden'); // reveal password
        oldPassword = passwordSection.textContent;
        passwordTextfield.querySelector('.mdc-textfield__input').value = oldPassword;
        passwordSection.textContent = "";
        passwordSection.appendChild(passwordTextfield);
    }

    var oldNote = "";
    if (noteSection.textContent != "") {
        // make note section editable
        var noteTextfield = document.createElement('div');
        noteTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
        oldNote = noteSection.textContent;
        noteTextfield.querySelector('.mdc-textfield__input').value = oldNote;
        noteSection.textContent = "";
        noteSection.appendChild(noteTextfield);
    }

    if (editBtn.parentNode != null) {
        // remove existing event listener, and add new event listener
        var newEditBtn = editBtn.cloneNode(true);
    
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        newEditBtn.addEventListener('click', this.saveChanges.bind(this, newEditBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key));
    }
};

// Delete a password
Passwordr.prototype.deletePassword = function(key) {
    if (this.checkSignedIn()) {
        var passwordr = this;

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

    // populate fields
    nameHeader.textContent = name;
    urlHeader.textContent = url;
    passwordSection.textContent = password;
    passwordSection.setAttribute('hidden', 'true'); // hide password text
    noteSection.textContent = note;

    // add event handlers to buttons
    var revealBtn = div.querySelector('.reveal');
    revealBtn.addEventListener('click', this.revealPassword.bind(this, passwordSection, revealBtn));
    // re-enable reveal button (if it was disabled)
    if (passwordChanged) {
        revealBtn.removeAttribute('disabled');
    }

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
    newDeleteBtn.addEventListener('click', this.deletePassword.bind(this, key));
};

// Loads passwords
Passwordr.prototype.loadPasswords = function() {
    this.newPasswordButton.removeAttribute('disabled');

    // Reference to the /users/{$uid}/ database path
    this.passwordsRef = this.database.collection("passwords");/*ref('users/' + this.auth.currentUser.uid + '/passwords');*/
    
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
        div.parentNode.removeChild(div);
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

        // Set the user's profile pic and name
        this.userPic.setAttribute('src', profilePicUrl);
        this.userName.textContent = userName;

        // Show user's profile and sign-out button
        this.userName.removeAttribute('hidden');
        this.userPic.removeAttribute('hidden');
        this.signOutButton.removeAttribute('disabled');

        // Hide sign-in button
        this.signInButton.setAttribute('disabled', 'true');

        // get master password
        this.masterPasswordDialog.show();

        this.loadPasswords();
    } else { // User is signed out
        // Hide user's profile, and disable sign-out button
        this.userName.setAttribute('hidden', 'true');
        this.userPic.removeAttribute('src');
        this.signOutButton.setAttribute('disabled', 'true');
    
        // Enable sign-in button
        this.signInButton.removeAttribute('disabled');

        // remove passwords from list
        while (this.passwordList.hasChildNodes()) {
            this.passwordList.removeChild(this.passwordList.lastChild);
        }
    }
};

window.onload = function() {
    window.passwordr = new Passwordr();
};  