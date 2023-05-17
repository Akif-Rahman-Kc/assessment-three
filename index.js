const express = require('express');
const dbConnection = require('./config/connection')
const userRouter = require('./routes/team')
const cors = require('cors')
const app = express();
const port = 4000;
const dotenv = require('dotenv')
dotenv.config();

app.use(express.json())
app.use(cors())

app.use('/', userRouter)

dbConnection.connect()

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});