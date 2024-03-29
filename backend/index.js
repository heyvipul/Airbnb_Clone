const express = require("express")
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const User = require("./models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
var cookieParser = require('cookie-parser')
const imageDownloader = require('image-downloader');
const PlaceModel = require('./models/Place')
const multer = require("multer"); // to upload file from client to server
const fs = require("fs"); // to rename files
const { title } = require("process");

require("dotenv").config();
const app = express();

const bcryptSalt = bcrypt.genSaltSync(6);
const jwtsecret = "sjkhfycndhskfe5848djhvicghjke"

app.use(express.json());
app.use(cookieParser())
app.use('/uploads',express.static(__dirname+'/uploads'))

app.use(
    cors({
      origin: "http://localhost:3000", // Replace with your frontend URL
      credentials: true, // Allow cookies and other credentials to be sent
    })
  );

mongoose.connect(process.env.MONGO_URL)

app.get("/test",(req,res)=>{
    res.json("test ok")
})

app.post("/register",async(req,res)=>{
  const {name,email,password} = req.body;
  try {
    const userDoc = await User.create({
        name,
        email,
        password:bcrypt.hashSync(password,bcryptSalt),
      })
      res.json(userDoc)
  } catch (error) {
    console.log({error:"error in registration"});
  }
})

app.post("/login",async(req,res)=>{
    const {email,password} = req.body;

    const userDoc = await User.findOne({email})
    if(userDoc){
        const passOk = bcrypt.compareSync(password,userDoc.password)
        if(passOk){
            jwt.sign({email:userDoc.email,id:userDoc._id},jwtsecret,{},(err,token)=>{
                if(err) throw err;
                res.cookie("token",token).json({userDoc:userDoc,data:"password match"})
                
            })

        }else{
            res.status(422).json("password wrong")
        }
    }else{
        res.json("user not found!")
    }
})

app.get("/profile",  (req,res)=>{
    const {token} = req.cookies
    if(token){
        jwt.verify(token,jwtsecret,{},async(err,userData)=>{
           if(err) throw err;
           const {name,email,_id} = await User.findById(userData.id)

           res.json({name,email,_id})
        })
    }else{
        res.json(null);
    }
})

app.post("/logout", (req,res)=>{
    res.cookie('token','').json(true);
})

// console.log(__dirname)

app.post("/upload-by-link" ,async (req,res)=>{
    const {link} = req.body;
    const newName = "photo"+ Date.now() + '.jpg'
    await imageDownloader.image({
        url : link,
        dest :  __dirname + '/uploads/' + newName 
    })
    res.json(newName)
})

const photosMiddleware = multer({dest:'uploads'})

app.post('/upload',photosMiddleware.array('photos',100),(req,res)=>{
    const uploadedFiles = [];
    for(let i=0;i<req.files.length;i++){
        const {path,originalname} = req.files[i]
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1]
        const newPath = path +'.' + ext;
        fs.renameSync(path,newPath)
        uploadedFiles.push(newPath.replace('uploads\\', ''));
    }
    res.json(uploadedFiles)

})


app.post('/places',(req,res)=>{
    const {token} = req.cookies
    const {title,address,addedPhotos,description, perks,extraInfo,
          checkIn,checkOut,maxGuests} = req.body

    jwt.verify(token,jwtsecret,{},async(err,userData)=>{
        if(err) throw err;

        const placeDoc = await PlaceModel.create({
            owner:userData.id,
            title,address,addedPhotos,description, perks,extraInfo,
            checkIn,checkOut,maxGuests   
        })
        res.json(placeDoc)
     })  
})

app.listen(4000,()=>{
    console.log("port 4000 running!");
})