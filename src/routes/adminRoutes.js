const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { listUsers } = require("../controllers/adminController");

const router = express.Router();

function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Acceso solo para administradores" });
}

router.get("/all", authMiddleware, isAdmin, listUsers);

module.exports = router;
