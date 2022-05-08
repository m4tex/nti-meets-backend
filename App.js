//#region imports
const mongooseLeanId = require('mongoose-lean-id');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose')
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const cors = require('cors');
//#endregion

//#region mongoose initialization
mongoose.connect('mongodb://localhost:27017/nti-meets').then(() => console.log('Connected to the database.'));
mongoose.connection.on('error', (err) => console.log('MongoDB connection error: ' + err));

const accountDataSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    favorites: { type: [String], required: true },
    admin: { type: Boolean, required: true },
});
const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    date: { type: Date, required: true },
    content: { type: String, required: true },
    html: { type: Boolean, required: true },
    description: {type: String, required: true},
});

accountDataSchema.plugin(mongooseLeanId);
articleSchema.plugin(mongooseLeanId);

const Account = new mongoose.model('Account', accountDataSchema);
const Article = new mongoose.model('Article', articleSchema);

//#endregion

//#region express inintialization
const app = express();

async function userAuthMiddleware(req, res, next) {
    if (req.session.hasOwnProperty('userId')){
        next();
    }
    else {
        res.send({"auth" : false});
    }
}

async function adminAuthMiddleware(req, res, next) {
    if(typeof req.session.userId !== 'string'){
        res.end();
        return;
    }

    const acc = await Account.findOne({id: req.session.userId}).lean();
    if (acc && acc.admin){
        console.log('Authorizing admin activity');
        next();
    }
    else {
        res.send({"auth" : false});
    }
}

app.use(session({
    secret: 'myverysecretkeylol10239102390102391902',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30,  },
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/nti-meets' }),
}));
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(helmet());

app.listen(8000, () => {
    console.log('Listening at 8000');
});
//#endregion

//#region index and auth endpoints
app.get('/', (req, res) => {
    res.send('Uhhhhhh.... hello, you are not supposed to be here. You know that, right?');
});

app.post('/api/v1/logga-in', async function (req, res) {
    if(typeof req.body.username !== 'string' || typeof req.body.username !== 'string'){
        return;
    }

    const { username: rawUN, password: rawPWD } = req.body;
    const username = rawUN.trim(), password = rawPWD.trim();

    const acc = await Account.findOne({username: username}).lean();
    if (acc && acc.password === password) {
        req.session.userId = acc.id;
        req.session.username = acc.username;
        req.session.admin = acc.admin;
        res.status(201);
        res.send({"admin" : acc.admin, "username" : acc.username});
    } else {
        res.send({"err" : "Fel användarnamn eller lösenord"});
    }
});

app.post('/api/v1/skapa-konto', async function (req, res) {
    if(typeof req.body.username !== 'string' ||
        typeof req.body.username !== 'string' ||
        typeof  req.body.email !== 'string'){
        return;
    }

    const { username: rawUN, email: rawEmail, password: rawPWD } = req.body;
    const username = rawUN.trim(), email = rawEmail.trim(), password = rawPWD.trim();

    if (await Account.exists({username: username})) {
        res.send({"err" : "Det finns ett konto med det namnet"});
    } else if(await Account.exists({email: email})){
        res.send({"err" : "Det finns ett konto med angiven mejladress, vill du logga in istället?"});
    } else {
        Account.create({
            username: username,
            email: email,
            password: password,
            favorites: [],
            admin: false,
        }).then((acc) => {
            req.session.userId = acc.id;
            req.session.username = acc.username;
            req.session.admin = false;
            res.status(201);
            res.send({"username" : acc.username});
        });
    }
});

//No validation here because the authenticationMiddleware does that for us...
app.post('/api/v1/sso', userAuthMiddleware, function (req, res) {
    res.status(201);
    res.send({"admin" : req.session});
});

app.post('/api/v1/logout', userAuthMiddleware,function(req, res) {
    req.session.destroy(function (err) {
        console.log(err);
    });
});
//#endregion

//#region article endpoints

app.get('/api/v1/articles', userAuthMiddleware, function () {

});

app.get('/api/v1/articles/:id', userAuthMiddleware, function () {

});

app.post('/api/v1/articles', adminAuthMiddleware, function (req, res) {
    Article.create({
        html: req.body.html,
        title: req.body.title,
        author: req.session.userId,
        content: req.body.content,
        date: new Date(req.body.date),
        description: stripDescription(req.body.html, req.body.content),
    }).then(art => res.send()).catch(err => {
        res.send({"err" : err});
        console.log(err);
    });
});

function stripDescription(html, content) {
    if(!html){
        return content;
    }
    else {
        content.replace(/<\/?[^>]+(>|$)/g, " ");
    }
}

app.patch('/api/v1/articles/:id', adminAuthMiddleware, function () {

});

app.delete('/api/v1/articles/:id', adminAuthMiddleware, function() {

});

//#endregion

//#region other endpoints...
//Used to display author's username on articles
app.get('/api/v1/user/:id', userAuthMiddleware, async function(req, res) {
    console.log(req.params.id);
    const acc = await Account.findOne({id:req.params.id}).lean();
    if (acc){
        res.send({"username" : acc.username});
    }
    else {
        res.send({"username" : "Borttagen"});
    }
});

// //This one sends back the user's nickname
// app.get('/api/v1/user', userAuthMiddleware, function (req, res) {
//    res.send({"username" : req.session.username});
// });
//#endregion