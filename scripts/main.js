'use strict';

// Initializes Passwordr
function Passwordr() {
    this.checkSetup();

    // Shortcuts to DOM elements
    this.passwordList = document.getElementById('passwords');    
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');    
    this.userPic = document.getElementById('user-pic');    
    this.userName = document.getElementById('user-name');    
    this.signInSnackbar = document.getElementById('must-signin-snackbar');    

    this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    
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
};

// Signs-out of Passwordr
Passwordr.prototype.signOut = function() {
    // Sign out of Firebase
    this.auth.signOut();
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
Passwordr.prototype.checkSignedInWithPassword = function() {
    // Check if user is signed in to Firebase
    if (this.auth.currentUser) {
        return true;
    }

    // Display a message to the user using a Toast.
    var data = {
        message: 'You must sign in first',
        timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
};

// Save changes to a password
Passwordr.prototype.saveChanges = function(editBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key) {
    var newName = nameTextfield.querySelector('.mdc-textfield__input').value;
    var newUrl = urlTextfield.querySelector('.mdc-textfield__input').value;
    var newPassword = passwordSection.firstChild.querySelector('.mdc-textfield__input').value;
    var newNote = noteSection.firstChild.querySelector('.mdc-textfield__input').value;
    var resetBtns = false;

    // if no changes were made, simply reset the fields
    if (nameHeader.textContent == newName && urlHeader.textContent == newUrl && oldPassword == passwordSection.querySelector('.mdc-textfield__input').value && oldNote == noteSection.querySelector('.mdc-textfield__input').value) {
        var textfields = nameTextfield.parentNode.querySelectorAll('.mdc-textfield');
        Array.prototype.forEach.call( textfields, function( textfield ) {
            textfield.parentNode.removeChild( textfield );
        });
        
        nameTextfield.parentNode.appendChild(nameHeader);
        urlTextfield.parentNode.appendChild(urlHeader);

        resetBtns = true;
    } else {
        // Check that the user entered at least a name and password, and that the user is signed in
        if (newName.length > 0 && newPassword.length > 0 && this.checkSignedInWithPassword()) {
            var currentUser = this.auth.currentUser;
            // update Firebase
            this.passwordsRef.child(key).set({
                name: newName,
                url: newUrl,
                password: newPassword,
                note: newNote
            }).then(function() {
                resetBtns = true;
            }.bind(this)).catch(function(error) {
                console.error('Error saving password', error);
            });
        } else {
            if (newName.length == 0) {
                var data = {
                    message: 'Name is required',
                    timeout: 2000
                };
                this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
            }
            if (newPassword.length == 0) {
                var data = {
                    message: 'Password is required',
                    timeout: 2000
                };
                this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
            }
        }
    }

    // this will be the case if either no changes were made, or the database was successfully updated
    // if the database was not successfully updated (e.g. data validation issues), the buttons should not be changed
    if (resetBtns) {
        // change "Done" button back to "Edit" button
        var newEditBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        newEditBtn.addEventListener('click', this.editPassword.bind(this, nameHeader, urlHeader, passwordSection, noteSection, newEditBtn, revealBtn, key));
        newEditBtn.textContent = "Edit";

        // re-enable reveal button (if is was disabled)
        revealBtn.removeAttribute('disabled');
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
    nameHeader.parentNode.appendChild(nameTextfield);
    nameHeader.parentNode.removeChild(nameHeader);

    // make url header editable
    var urlTextfield = document.createElement('div');
    urlTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
    urlTextfield.querySelector('.mdc-textfield__input').value = urlHeader.textContent;
    urlHeader.parentNode.appendChild(urlTextfield);
    urlHeader.parentNode.removeChild(urlHeader);
    
    // make password section editable
    var passwordTextfield = document.createElement('div');
    passwordTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
    passwordSection.removeAttribute('hidden'); // reveal password
    passwordTextfield.querySelector('.mdc-textfield__input').value = passwordSection.textContent;
    var oldPassword = passwordSection.textContent;    
    passwordSection.textContent = "";    
    passwordSection.appendChild(passwordTextfield);

    // make note section editable
    var noteTextfield = document.createElement('div');
    noteTextfield.innerHTML = Passwordr.TEXTFIELD_TEMPLATE;
    noteTextfield.querySelector('.mdc-textfield__input').value = noteSection.textContent;
    var oldNote = noteSection.textContent;
    noteSection.textContent = "";
    noteSection.appendChild(noteTextfield);

    // remove existing event listener, and add new event listener
    var newEditBtn = editBtn.cloneNode(true);
    editBtn.parentNode.replaceChild(newEditBtn, editBtn);
    newEditBtn.addEventListener('click', this.saveChanges.bind(this, newEditBtn, revealBtn, nameHeader, nameTextfield, urlHeader, urlTextfield, oldPassword, passwordSection, oldNote, noteSection, key));
}

// Delete a password
Passwordr.prototype.deletePassword = function(deleteBtn) {

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

    // if name & url fields are still editable (selectors will return null if this is the case), make them uneditable
    if (nameHeader == null && urlHeader == null) {
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
    var editBtn = div.querySelector('.edit');
    editBtn.addEventListener('click', this.editPassword.bind(this, nameHeader, urlHeader, passwordSection, noteSection, editBtn, revealBtn, key));
    var deleteBtn = div.querySelector('.delete');
    deleteBtn.addEventListener('click', this.deletePassword.bind(this, deleteBtn));
}

// Loads passwords
Passwordr.prototype.loadPasswords = function() {
    // Reference to the /passwords/ database path
    this.passwordsRef = this.database.ref('passwords');
    // Make sure we remove all previous listeners
    this.passwordsRef.off();

    // Load passwords
    var setPassword = function(data) {
        var val = data.val();
        this.displayPassword(data.key, val.name, val.url, val.password, val.note);
    }.bind(this);
    this.passwordsRef.on('child_added', setPassword);
    this.passwordsRef.on('child_changed', setPassword);
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

// Returns true if user is signed-in. Otherwise, returns false and displays a message
Passwordr.prototype.checkSignedInWithMessage = function() {
    // Return true if the user is signed in to Firebase
    if (this.auth.currentUser) {
        return true;
    }

    // Display a message to the user using a Toast
    var data = {
        message: 'You must sign-in first',
        timeout: 2000
    };

    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);

    return false;
};

window.onload = function() {
    window.passwordr = new Passwordr();
};  