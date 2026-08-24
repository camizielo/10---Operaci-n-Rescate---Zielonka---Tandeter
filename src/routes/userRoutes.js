const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getProfile, updateMe } = require("../controllers/userController");

const router = express.Router();

router.get("/me", getProfile, authMiddleware);
router.put("/me", authMiddleware, updateMe);

router.get("/orders", (req, res) => {
  return res.status(200).json({
    orders: [
      { id: "A1", total: 1250 },
      { id: "A2", total: 4900 }
    ]
  });
});

module.exports = router;
