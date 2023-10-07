// Core
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import admin from 'firebase-admin';
import "./auth.js";
import passport from "passport";

admin.initializeApp({
    credential: admin.credential.cert("serviceAccountKey.json")
});


// Globals
const server = express();
const datatabase = admin.firestore();
const accountsCollection = datatabase.collection("accounts");


// Config
server.use(express.json());
server.use(session({secret: "cats"}));
server.use(passport.initialize());
server.use(passport.session());

server.set("view engine", "ejs");
server.set("views", "./views");

server.use('/resources', express.static('resources'))


// Callbacks
passport.serializeUser(function(user, done) {
    admin.auth()
        .getUserByEmail(user.email)
        .then(userRecord => {
            done(null, user);
        })
        .catch(error => {
            if (error.code == "auth/user-not-found") {

                admin.auth().createUser({
                    email: user.email,
                    password: "undefined_password"
                }).then(userRecord => {

                    accountsCollection.add({
                        email: user.email,
                        username: user.given_name,
                        displayName: user.given_name,
                        description: "",
                        thumbUrl: user.picture,
                        locale: user.language
                    }).then(() => {
                        done(null, user);
                    }).catch(error => {
                        console.log(error);
                    });

                }).catch(error => {
                    console.log(error);
                });
            }
        })
});

passport.deserializeUser(function(user, done) {



    done(null, user);
}); 

function isLoggedIn(request, response, next) {
    //request.user ? next() : response.sendStatus(401);
    if (request.isAuthenticated()) {
        next();
    } else {
        response.sendStatus(401);
    }
}


// API Routes
server.get("/", (request, response) => {
    response.redirect(302, "/home")
});

server.get("/api/v1/auth/google", passport.authenticate("google", {scope: ["email", "profile"] }));

server.get("/api/v1/auth/google/callback", passport.authenticate("google", {
    successRedirect: "/api/v1/protected",
    failureRedirect: "/api/v1/auth/failure"
}));

server.get("/api/v1/auth/failure", (request, response) => {
    response.render("pages/loginError");
});

server.get("/api/v1/protected", isLoggedIn, (request, response) => {
    response.redirect(302, "/home");
});

server.get("/api/v1/logout", (request, response) => {
    request.logout();
    request.session.destroy();
    response.redirect(302, "/home")
});

server.get("/api/v1/users", (request, response) => {
    admin.firestore()
        .collection("accounts")
        .get()
        .then(snapshot => {
            const users = snapshot.docs.map(doc => ({
                ...doc.data(),
                docId: doc.id
            }));

            response.json(users);
        });
});


// View Routes
server.get("/home", async (request, response) => {
    let querySnapshot = request.isAuthenticated() ? await accountsCollection.where("email", "==", request.user.email).get() : null;

    response.render("pages/home", {isAuthenticated: request.isAuthenticated(), ...request.isAuthenticated() ? querySnapshot.docs[0].data() : null});
});

server.get("/profile/:username", async (request, response) => {
    let profileQuerySnapshot = await accountsCollection.where("username", "==", request.params.username).get();
    let querySnapshot = request.isAuthenticated() ? await accountsCollection.where("email", "==", request.user.email).get() : null;

    if (!profileQuerySnapshot.empty) {
        let profileData = profileQuerySnapshot.docs[0].data();
        response.render("pages/profile", {isAuthenticated: request.isAuthenticated(), ...request.isAuthenticated() ? querySnapshot.docs[0].data() : null, profile: {
            username: profileData.username,
            displayName: profileData.displayName,
            description: profileData.description,
            thumbUrl: profileData.thumbUrl,
            publicationSize: null,
            firsPublications: null
        }});
    } else {
        response.sendStatus(401);
    }
});


// Initialize
server.listen(8081, () => {
    console.log("listening now on port '8081'");
});