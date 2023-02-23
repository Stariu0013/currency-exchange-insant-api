const express = require("express");
const cors = require('cors');

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }))

app.use("/api/currency", require("./routes/currency.route"));

app.listen(PORT, () => {
    console.log(`App has been started on port ${PORT}`);
});