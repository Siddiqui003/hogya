const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = ['http://localhost:5173','http://localhost:5174'];

app.use(cors({
  origin: (origin, cb) => {
    console.log('Incoming origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('not allowed'));
  },
  credentials: true,
}));

app.post('/test', (req, res) => res.json({ok:true}));
app.listen(5999, () => console.log('test server on 5999'));