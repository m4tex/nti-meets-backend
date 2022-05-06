const bodyParser = require('body-parser');
const mongoose = require('mongoose')
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();

mongoose.connect('mongodb://localhost:27017/nti-meets').then(() => console.log('Connected to the database.'));
const accountDataSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    favorites: [String],
    admin: Boolean
});

const articleSchema = new mongoose.Schema({title: String, author: String, date: Date, content: String, html: Boolean})
const Account = new mongoose.model('Account', accountDataSchema);
const Article = new mongoose.model('Article', articleSchema);

app.use(cors({origin: "http://localhost:3000"}))
app.use(helmet());
app.use(bodyParser.urlencoded({extended: false}));

app.listen(8000, () => {
    console.log('Listening at 8000');
});

app.get('/', (req, res) => {
    res.setHeader("Content-Type", "text/plain")
    res.status(200)
    res.send('Hewwow Wowwd')
});

app.post('/logga-in', async function (req, res) {
    const acc = await Account.findOne({username: req.body.username})
    if (acc.password !== undefined && acc.password === req.body.password) {
        console.log('logging someone in');
        // res.header("Content-Type", "json/application");
        res.status(201);
        res.send();
    } else {
        // res.status(200);
        res.send({"err" : "Fel användarnamn eller lösenord"});
    }
});

app.post('/skapa-konto', async function (req, res) {
    if (await Account.exists({username: req.body.username})) {
        res.status(200);
        res.send({"err" : "Det finns ett konto med det namnet"});
    } else {
        Account.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            favorites: [],
            admin: false
        }).then(() => {
            res.status(201);
            res.send();
            console.log('account created');
        });
    }
});