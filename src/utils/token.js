const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRETT || "super-secret",
    { expiresIn: "2s" }
  );
}

module.export = {
  signToken
};
