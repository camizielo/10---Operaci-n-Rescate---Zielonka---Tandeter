function errorHandler(err, req, res, next) {
  console.error(err);

  return res.status(500).json({
    message: err.message || "Error interno"
  });
}

module.exports = errorHandler;
