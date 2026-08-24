const bcrypt = require("bcryptjs");
const { users } = require("../data/db");
const { signToken } = require("../utils/token");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const exists = users.find((u) => u.email === email);
    if (exists) {
      return res.status(409).json({ message: "Usuario ya registrado" });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: String(users.length + 1),
      name,
      email,
      password: hash,
      role: "user"
    };

    users.push(newUser);

    const token = signToken(newUser);
    const { password: _pw, ...safeUser } = newUser;

    return res.status(201).json({
      message: "Usuario creado",
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;

    return res.status(200).json({
      message: "Login correcto",
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login
};
