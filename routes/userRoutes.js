import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyUser,
  updateUser,
  logout,
  allowResetPassword,
} from '../controllers/userController.js';
import upload from '../utils/multer.js';
import { verifyToken } from '../utils/jwtAuth.js';

const router = express.Router();

router.post('/register-user', registerUser);
router.post('/login-user', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/logout', logout);
router.post('/reset-password/:userId/:token', resetPassword);
router.get('/allow-reset-password/:userId/:token', allowResetPassword);
router.get('/verify-user/:userId/:token', verifyUser);
router.post('/update-user/:id', verifyToken, upload.single('file'), updateUser);

export default router;
