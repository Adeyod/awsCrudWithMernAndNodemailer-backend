import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const generateToken = async (res, user) => {
  try {
    const payload = {
      userId: user._id,
      email: user.email,
    };
    const payload2 = {
      userId: user._id,
      firstName: user.firstName,
      unique: uuidv4(),
    };

    const token = await jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15d',
    });

    const frontToken = await jwt.sign(payload2, process.env.JWT_SECRET, {
      expiresIn: '15d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    return frontToken;
  } catch (error) {
    console.log(error);
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.json({
        message: 'Please login to continue',
        status: 400,
        success: false,
      });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.json({
            message: 'Token expired',
            status: 401,
            success: false,
          });
        } else {
          return res.json({
            message: 'Invalid token',
            status: 401,
          });
        }
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.log(error);
  }
};

export { generateToken, verifyToken };
