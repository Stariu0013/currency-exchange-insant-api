const express = require("express");
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 5500;

const app = express();
app.use(cors());

app.use(express.json({extended: true}));
app.use(express.urlencoded({extended: true}))

app.use("/api/currency", require("./routes/currency.route"));

app.listen(PORT, () => {
    console.log(`App has been started on port ${PORT}`);
});

app.get("*", function (req, res) {
    res.send('PAGE NOT FOUND');
});