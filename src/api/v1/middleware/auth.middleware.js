const jwt = require("jsonwebtoken");
import config from '../../../config/config.js';

exports.verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
    if (!token) return res.status(403).json({ message: 'Access denied. No token provided.' });
  
    try {
      const verified = jwt.verify(token.replace('Bearer',''),config.JWT_SECRET);
        req.user = verified
      next();
    } catch (error) {
      res.status(403).json({ message: 'Invalid token', error: error.message });
    }
  }