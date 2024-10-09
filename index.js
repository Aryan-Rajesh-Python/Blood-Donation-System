const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const port = 81;
const bcrypt = require("bcrypt");
const ejs = require('ejs'); 
var cors = require('cors');
const { process_params } = require("express/lib/router");
const res = require("express/lib/response");
mongoose.connect("mongodb://localhost:27017/bloodDonationDB", {useNewUrlParser : true});
const saltRounds = 2;
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.get("/Home", (req, res)=>{
    res.render("home.ejs");
});

app.get("/userPage", (req, res)=>{
    res.render("userPage");
})

app.get("/rp", (req, res)=>{
    res.render("requestPosts.ejs");
})

app.get("/rr", (req, res)=>{
    res.render("requestReturn.ejs");
})



//REQUEST SCHEMA
const requestSchema = new mongoose.Schema({
    bloodGroup : String,
    city : String,
    state : String,
    phone : String,
    email : String,
    sameState : Number, //0 look in city only, 1 look in state
    username : String //hidden input can use this for determining which user registered the request 
});

const Request = new mongoose.model("requests", requestSchema);

const contactSchema = new mongoose.Schema({
    name : String,
    email : String,
    message : String
});

const Contact = new mongoose.model("contacts", contactSchema);

app.post("/contact", (req, res)=>{
    const newContact = new Contact({
        name : req.body.name,
        email : req.body.email,
        message : req.body.message
    });
    newContact.save((err)=>{
        if(err){
            console.log(err);
        }
        else{
            res.send("Message received");
        }
    })
})

//defining user schema
const userSchema = new mongoose.Schema({
    name : String,
    age : Number,
    email : String,
    phone : Number,
    state : String,
    city : String,
    bloodGroup : String,
    reqs : [requestSchema],
    password : String
})
const User = new mongoose.model("users", userSchema);


//Hospital schema
const hospitalSchema = new mongoose.Schema({
    name : String,
    city : String,
    state : String,
    aPlus : Number,
    aMin : Number,
    bPlus : Number,
    bMin : Number,
    oPlus : Number,
    oMin : Number,
    email : String,
    phone : Number,
    password : String,
    approved : Number //if 0 then pending for approval ,  1 approved
});
const Hospital = new mongoose.model("hospital", hospitalSchema);




app.get("/contact", (req, res)=>{
    res.render("contactUs");
})

app.get("/about", (req, res)=>{
    res.render("aboutUS");
})



app.get("/bloodyPosts", (req, res)=>{
    Request.find({}, (err, data)=>{
        if(err){
            console.log("error");
        }
        else if(data){
            console.log(data);
            res.render("requestPosts", {data : data});
        }
    })
});



/*
    USER REGISTRATION AND LOGIN
*/
//Registering a user 
app.post("/userRegister", (req, res)=>{
    //console.log(req);
    const name = req.body.name;
    const age = req.body.age;
    const email = req.body.email;
    const phone = req.body.phone;
    const state = req.body.state;
    const blood = req.body.blood;
    const city = req.body.city;
    bcrypt.hash(req.body.password, saltRounds, (err, hash)=>{
        const newUser =  new User({
            name: name,
            age :  age,
            email: email,
            phone : phone,
            state : state,
            city : city,
            bloodGroup : blood,
            password : hash
        });
        newUser.save((err)=>{
            if(err){
                console.log(err);
            }
            else{
                res.render("registrationSful");
            }
        })
    })
})


//displaying the register page to the user
app.get("/userRegister", (req, res)=>{
    res.render("useregister.ejs");
})

//user login
app.post("/userLogin", (req, res)=>{
    const email_ = req.body.email;
    const password = req.body.password;
    User.findOne({email : email_}, (err, data)=>{
        if(err){
            res.send("Some error occured");
        }
        else{
            if(data){
                bcrypt.compare(password, data.password, (err, res2)=>{
                    if(res2 === true){
                        res.render("userPage.ejs", {t_userData:data});
                    }
                    else{
                        res.send("User with the given credentials not found");
                    }
                })
            }
        }
    })   
})

app.get("/userLogin", (req, res)=>{
    res.render("userLogin");
});


/*

            HOSPITAL REGISTER


*/


//Registering a hospital 
app.post("/hospitalRegister", (req, res)=>{
    const name = req.body.name;
    const email =  req.body.email;
    const phone = req.body.phone;
    const state = req.body.state;
    const city = req.body.city;
    bcrypt.hash(req.body.password, saltRounds, (err, hash)=>{
        const newHospital = new Hospital({
            name : name,
            city : city,
            email : email,
            phone : phone,
            state : state,
            approved : 0,
            password : hash,
            aPlus : 10,
            aMin : 11,
            bPlus : 9,
            bMin : 10,
            oPlus : 10,
            oMin :11
        });
        newHospital.save(err=>{
            if(err){
                console.log(err);
            }
            else{
                res.render("hospitalSuccessful");
            }
        })
    })
})

//posting the login data for validation 
app.post("/hospitalLogin", (req, res)=>{
    const email = req.body.email;
    const password = req.body.password;
    Hospital.findOne({email : email, approved : 1}, (err, data)=>{
        if(err){
            console.log("Somer error occurred");
        }
        else{
            if(data){
                bcrypt.compare(password, data.password, (err, res2)=>{
                    if(res2 === true){
                        res.send(data);
                    }
                })
            }
            else{
                res.send("Given credentials not found or not yet approved");
            }
        }
    })
})
//handling get requests
app.get("/hospitalRegister",(req, res)=>{
    res.render('hospitalRegister.ejs');
});

app.get("/hospitalLogin", (req, res)=>{
    res.render("hospitalLogin");
});


/*
        REQUEST LOGIN 

*/

//creating a new request, checking if the request can be satisfied 
app.get("/request", (req, res)=>{
    res.render("request");
})



app.post("/request" ,(req, res)=>{
    const blood = req.body.blood;
    const email =  req.body.email;
    const phone = req.body.phone;
    const state = req.body.state;
    const city = req.body.city;
    const sameState = 0;
    const username = req.body.username;
    //console.log(req);
    console.log(blood);
    if(sameState == 0){
        Hospital.findOne({city : city, approved : 1, [blood] : {$gt : 1}}, (err, data)=>{
            if(err){
                console.log("Some error occurred");
            }
            else{
                if(data){
                    res.render("requestReturn.ejs", {fulfil : data});
                }
                else{
                    res.render("noHospital");
                    const newReq = new Request({
                        bloodGroup : blood,
                        city : city,
                        state : state,
                        phone : phone,
                        email : email,
                        sameState : sameState,
                        username : username
                    })
                    newReq.save(err=>{
                        if(err){
                            console.log(err);
                        }
                    })
                }
            }
        })
    }
    else if(sameState == 1){
        Hospital.findOne({state : state,  approved : 1, [blood] : {$gt : 1}}, (err, data)=>{
            if(err){
                console.log("Some error occurred");
            }
            else{
                if(data){
                    res.send(data);
                }
                else{
                    res.send("No hospital with the requireed blood found in our database , you are on your own now");
                    const newReq = new Request({
                        bloodGroup : blood,
                        city : city,
                        state : state,
                        phone : phone,
                        email : email,
                        sameState : sameState,
                        username : username
                    })
                    newReq.save(err=>{
                        if(err){
                            console.log(err);
                        }
                    })
                }
            }
        })

    }
    
});


//editing hospital 
app.post("/editHospital/:email", (req, res)=>{
    const email = req.params.email;
    const aPlus_ = req.query.aPlus;
    const aMin_  = req.query.aMin;
    const bPlus_ = req.query.bPlus;
    const bMin_ = req.query.bMin;
    const oPlus_ = req.query.oPlus;
    const oMin_ = req.query.oMin;
    Hospital.findOneAndUpdate({email : email}, {$set : {aPlus : 69, aMin : aMin_, bPlus : bPlus_,  bMin : bMin_, oPlus : oPlus_, oMin : oMin_}}, {returnOriginal: false}, (err, doc)=>{
        if(err){
            console.log(err);
        }
        else{
            res.send(doc);
        }
    });
})

app.delete("/requestDelete/:req_id", (req, res)=>{
    const req_id = req.params.req_id;
    Request.findByIdAndRemove(req_id, (err)=>{
        if(err){
            console.log(err);
        }  
    })
})


app.get("/read", (req, res)=>{
    res.render("read");
})

//posting request methods 
app.get("/", (req, res)=>{
    res.send("Server up and running");
});

app.listen(port, ()=>{
    console.log("Server started at port 8080");
})