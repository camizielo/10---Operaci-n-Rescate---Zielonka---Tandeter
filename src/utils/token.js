const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "super-secret",
    { expiresIn: "2h" }
  );
}

module.exports = {
  signToken
};
