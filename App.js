//#region imports
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
});
//#endregion

//#region express inintialization
const app = express();

const Account = new mongoose.model('Account', accountDataSchema);
const Article = new mongoose.model('Article', articleSchema);

function userAuthMiddleware(req, res, next) {
    if (typeof req.session.userId === 'string' && Account.exists({id: req.session.userId})){
        next();
    }
    else {
        res.sendStatus(401);
    }
}

async function adminAuthMiddleware(req, res, next) {
    if(typeof req.session.userId !== 'string'){
        return;
    }

    const acc = await Account.findOne({id: req.session.userId});
    if (acc && acc.admin){
        console.log('Authorizing admin activity');
        next();
    }
    else {
        res.sendStatus(401);
    }
}

app.set('trust proxy', 1);
app.use(session({
    secret: 'myverysecretkeylol10239102390102391902',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/nti-meets' }),
}));
app.use(express.json());
app.use(cors({origin: "http://localhost:3000"}))
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

    const { rawUN, rawPWD } = req.body;
    const username = rawUN.trim(), password = rawPWD.trim();

    const acc = await Account.findOne({username: username});
    if (acc && acc.password === password) {
        req.session.username = username;
        res.status(201);
        res.send({"admin" : acc.admin});
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

    const { rawUN, rawEmail, rawPWD } = req.body;
    const username = rawUN.trim(), email = rawEmail.trim(), password = rawPWD.trim();

    if (Account.exists({username: username})) {
        res.send({"err" : "Det finns ett konto med det namnet"});
    } else if(Account.exists({email: email})){
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
            res.sendStatus(201);
        });
    }
});

//No validation here because the authenticationMiddleware does that for us...
app.post('/api/v1/sso', userAuthMiddleware, function (req, res) {
    res.status(201);
    res.send({"admin" : req.session.admin});
});
//#endregion

//#region article endpoints

app.get('/api/v1/articles', userAuthMiddleware, function (){

});

app.get('/api/v1/articles/:id', userAuthMiddleware, function (){

});

//Creates an article
app.post('/api/v1/articles', adminAuthMiddleware, function (){
    console.log('creating article...');
});


app.patch('/api/v1/articles/:id', adminAuthMiddleware, function () {

});

app.delete('/api/v1/articles/:id', adminAuthMiddleware, function() {

});

//#endregion