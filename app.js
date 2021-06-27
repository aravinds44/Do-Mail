require('dotenv').config()

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine","ejs");

app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname+"/public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://'+process.env.ATLAS_USERNAME_PASSWORD+'@cluster1.k6kfx.mongodb.net/domailDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const mailSchema = new mongoose.Schema({
    toUser:String,
    fromUser:String,
    subject:String,
    content:String,
    read:Boolean
});

const Mail = new mongoose.model("Mail",mailSchema);



const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    mails:[mailSchema],
    sentMails:[mailSchema]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  

app.get("/",function(req,res){
    res.render("home");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/mails",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(err){
                console.log(err);
            }
            else{
                if(foundUser){
                    res.render("mails",{userMails:foundUser.mails});
                }
            }
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/sent",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(err){
                console.log(err);
            }
            else{
                if(foundUser){
                    res.render("sent",{userMails:foundUser.sentMails});
                }
            }
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/compose",function(req,res){
    if(req.isAuthenticated()){
        res.render("compose");
    }
    else{
        res.redirect("/");
    }
    
});

app.post("/compose",function(req,res){
    const submittedMail = new Mail({
        toUser:req.body.toUser,
        fromUser:req.user.username,
        subject:req.body.subject,
        content : req.body.content,
        read:false
    });

    req.user.sentMails.push(submittedMail);
    req.user.save(function(err){
        if(err){
            console.log(err);
        }
        else{
            console.log("Mail saved to sent");
        }
    });


    User.findOne({username : submittedMail.toUser},function(err,foundUser){
        if(err){
            console.log(err);
        }
        else{
            if(foundUser){
                console.log(foundUser);
                foundUser.mails.push(submittedMail);
                foundUser.save(function(err){
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log("Mail sent");
                        res.redirect("/mails");
                    }
                })
            }
        }
    });

});

app.post("/register",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/mails")
            });
        }
    });

});

app.post("/login",function(req,res){

    const user = new User({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/mails");
            });
        }
    });
});

app.get("/about",function(req,res){
    if(req.isAuthenticated()){
        res.render("about");
    }
    else
    {
        res.redirect("/login");
    }
})

app.get("/mails/:mailId",function(req,res){
    
    if(req.isAuthenticated()){
        const userMails = req.user.mails;
        const userMail = userMails.find(function(mail){
            return(mail._id == req.params.mailId);
        });  
        res.render("mail",{mail:userMail});

    }
    else{
        res.redirect("/login")
    }
});

app.get("/sent/:mailId",function(req,res){
    
    if(req.isAuthenticated()){
        const userMails = req.user.sentMails;
        const userMail = userMails.find(function(mail){
            return(mail._id == req.params.mailId);
        }); 

        console.log(userMail);   
        res.render("mail",{mail:userMail});

    }
    else{
        res.redirect("/login")
    }
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});



app.listen(3000,function(){
    console.log("Server Running on port 3000");
});
