const express = require("express");
const { listUsers } = require("../controllers/adminController");

const router = express.Router();

router.get("/all", listUsers);

module.exports = router;
