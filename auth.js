import passport from 'passport';
import GoogleStrategy from "passport-google-oauth2"

passport.use(new GoogleStrategy({
        clientID: "295878986936-jh916vi5irq5vpe53dtsb6epdbn5g0qi.apps.googleusercontent.com",
        clientSecret: "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",
        callbackURL: "http://localhost:8081/api/v1/auth/google/callback",
        passReqToCallback: true
    },
    function(request, accessToken, refreshToken, profile, done) {
        //User.findOrCreate({ googleId: profile.id }, function (err, user) {
        //    return done(err, user);
        //});
        return done(null, profile);
    }
));