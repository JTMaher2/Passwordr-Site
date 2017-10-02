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
    
    var passwordr = this;    
    this.newPasswordDialog.listen('MDCDialog:accept', function() {
        passwordr.newPassword();
    });

    this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));

    this.newPasswordButton.addEventListener('click', function (evt) {
        passwordr.newPasswordDialog.lastFocusedTarget = evt.target;
        passwordr.newPasswordDialog.show();
    });

    this.initFirebase();
}

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
    this.database = firebase.database();
    
    // Initiate Firebase Auth, and listen to auth state changes
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Signs-in to Passwordr
Passwordr.prototype.signIn = function() {
    // Sign in to Firebase using popup auth and Google as the identity provider
    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider);
    this.newPasswordButton.removeAttribute('disabled');    
};

// Signs-out of Passwordr
Passwordr.prototype.signOut = function() {
    // Sign out of Firebase
    this.auth.signOut();
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
            // update Firebase
            this.passwordsRef.push({
                name: name,
                url: url,
                password: password,
                note: note
            }).catch(function(error) {
                var data = {
                    message: 'Error adding password: ' + error,
                    timeout: 2000
                };
                this.messageSnackbar.show(data);
            });
        } else {
            var data = {
                message: 'Password must match confirm password',
                timeout: 2000
            };
            this.messageSnackbar.show(data);
        }
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

// Show a password
Passwordr.prototype.revealPassword = function(passwordSection, revealBtn) {
    passwordSection.removeAttribute('hidden');
    revealBtn.setAttribute('disabled', 'true');
}

// Returns true if user is signed-in. Otherwise false and displays a message.
Passwordr.prototype.checkSignedIn = function() {
    // Check if user is signed in to Firebase
    if (this.auth.currentUser) {
        return true;
    }

    // Display a message to the user using a Toast.
    var data = {
        message: 'You must sign in first',
        timeout: 2000
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
            this.passwordsRef.child(key).set({
                name: newName,
                url: newUrl,
                password: newPassword,
                note: newNote
            }).then(function() {
                this.displayPassword(key, newName, newUrl, newPassword, newNote);           
            }.bind(this)).catch(function(error) {
                var data = {
                    message: 'Error saving password: ' + error,
                    timeout: 2000
                };
                this.messageSnackbar.show(data);
            });
        } else {
            if (newName.length == 0) {
                var data = {
                    message: 'Name is required',
                    timeout: 2000
                };
                this.messageSnackbar.show(data);
            }
            if (newPassword.length == 0) {
                var data = {
                    message: 'Password is required',
                    timeout: 2000
                };
                this.messageSnackbar.show(data);
            }
        }
    }
}

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
}

// Delete a password
Passwordr.prototype.deletePassword = function(key) {
    if (this.checkSignedIn()) {
        var passwordr = this;

        this.passwordsRef.child(key).remove()
        .then(function() {
            var data = {
                message: 'Remove succeeded.',
                timeout: 2000
            };
            passwordr.messageSnackbar.show(data);
            passwordr.loadPasswords();
        })
        .catch(function(error) {
            var data = {
                message: "Remove failed: " + error.message,
                timeout: 2000
            };
            passwordr.messageSnackbar.show(data);
        });
    }   
}

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
}

// Remove a password from the UI
Passwordr.prototype.removePassword = function(key) {
    var div = document.getElementById(key);
    div.parentNode.removeChild(div);
}

// Loads passwords
Passwordr.prototype.loadPasswords = function() {
    // Reference to the /users/{$uid}/ database path
    this.passwordsRef = this.database.ref('users/' + this.auth.currentUser.uid + '/');
    // Remove all previous listeners
    this.passwordsRef.off();

    // Load passwords
    var setPassword = function(data) {
        var val = data.val();
        this.displayPassword(data.key, val.name, val.url, val.password, val.note);
    }.bind(this);

    var passwordr = this;

    var removePassword = function(data) {
        var val = data.val();
        passwordr.removePassword(data.key);
    }

    this.passwordsRef.on('child_added', setPassword);
    this.passwordsRef.on('child_changed', setPassword);
    this.passwordsRef.on('child_removed', removePassword);
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