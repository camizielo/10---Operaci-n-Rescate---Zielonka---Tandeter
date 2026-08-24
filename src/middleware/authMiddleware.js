const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
  const token = authHeader ? authHeader.replace("Bearer ", "") : null;

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret");
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(403).json({ message: "Token invalido" });
  }
}

module.exports = authMiddleware;
