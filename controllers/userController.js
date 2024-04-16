import { sendMessageToQueue } from '../aws/sqsService.js';
import Token from '../models/Token.js';
import User from '../models/userModel.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwtAuth.js';
import {
  s3DeleteImageUrl,
  s3GetImageUrl,
  s3UploadImage,
} from '../aws/s3Service.js';
import fs from 'fs';

const forbiddenCharsRegex = /[|!{}()&=[\]===><>]/;

const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, password, confirmPassword, email } =
      req.body;
    console.log(req.body);
    if (
      !firstName ||
      !lastName ||
      !userName ||
      !password ||
      !confirmPassword ||
      !email
    ) {
      return res.json({
        message: 'All fields are required',
        status: 400,
        success: false,
      });
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedUserName = userName.trim();
    const trimmedEmail = email.trim();

    if (forbiddenCharsRegex.test(trimmedFirstName)) {
      return res.json({
        message: `Invalid character for field first name`,
        status: 400,
        success: false,
      });
    }

    if (forbiddenCharsRegex.test(trimmedLastName)) {
      return res.json({
        message: `Invalid character for field last name`,
        status: 400,
        success: false,
      });
    }

    if (forbiddenCharsRegex.test(trimmedUserName)) {
      return res.json({
        message: `Invalid character for field username`,
        status: 400,
        success: false,
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.json({
        message: 'Invalid input for email...',
        status: 400,
        success: false,
      });
    }

    if (
      !/^(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,20}$/.test(
        password
      )
    ) {
      return res.json({
        message:
          'Password must contain at least 1 special character, 1 lowercase letter, and 1 uppercase letter. Also it must be minimum of 8 characters and maximum of 20 characters',
        success: false,
        status: 401,
      });
    }

    if (password !== confirmPassword) {
      return res.json({
        message: 'Password and confirm password do not match',
        status: 400,
        success: false,
      });
    }

    const userFound = await User.findOne({
      $or: [
        { email: trimmedEmail },
        { userName: { $regex: `^${trimmedUserName}$`, $options: 'i' } },
      ],
    });

    if (userFound) {
      if (
        userFound.userName === trimmedUserName &&
        userFound.email === trimmedEmail
      ) {
        return res.json({
          message:
            'Email and username are already taken. If you are the owner of the account, please login',
          status: 400,
          success: false,
        });
      } else if (userFound.userName === trimmedUserName) {
        return res.json({
          message: 'Username is already taken',
          status: 400,
          success: false,
        });
      } else {
        if (userFound.email === trimmedEmail) {
          return res.json({
            message: 'Email is already taken',
            status: 400,
            success: false,
          });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await new User({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      userName: trimmedUserName,
      email: trimmedEmail,
      password: hashedPassword,
    }).save();

    const token =
      crypto.randomBytes(32).toString('hex') +
      crypto.randomBytes(32).toString('hex');

    const newToken = await new Token({
      userId: newUser._id,
      token,
    }).save();

    // firstname, email, userId, link
    const link = `${process.env.FRONTEND_URL}/email-verification/?userId=${newToken.userId}&token=${newToken.token}`;

    const makeString = JSON.stringify(newUser._id);

    const body = {
      link: link,
      firstName: newUser.firstName,
      email: newUser.email,
      userId: newUser._id,
      messageTitle: 'Email Verification',
    };

    await sendMessageToQueue(body);
    return res.json({
      message:
        'Registration successful. Please check your email for verification link',
      success: true,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const verifyUser = async (req, res) => {
  try {
    const { userId, token } = req.params;
    const checkToken = await Token.findOne({
      userId,
      token,
    });

    if (!checkToken) {
      return res.json({
        message: 'Token not found',
        status: 404,
        success: false,
      });
    }

    const validateUser = await User.findByIdAndUpdate(
      {
        _id: userId,
      },
      {
        $set: { isVerified: true },
      },
      { new: true }
    );

    if (!validateUser) {
      return res.json({
        message: 'Unable to validate user',
        status: 400,
        success: false,
      });
    }

    await checkToken.deleteOne();

    return res.json({
      message: `${validateUser.firstName}, Verification successful, you can now login`,
      success: true,
      status: 200,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) {
      return res.json({
        message: 'All fields are required',
        success: false,
        status: 400,
      });
    }

    const trimmedUserName = userName.trim();
    if (forbiddenCharsRegex.test(trimmedUserName)) {
      return res.json({
        message: 'Invalid characters in field username',
        status: 400,
        success: false,
      });
    }

    const userExist = await User.findOne({
      userName: { $regex: `^${trimmedUserName}$`, $options: 'i' },
    });

    if (!userExist) {
      return res.json({
        message: 'Invalid credentials',
        status: 400,
        success: false,
      });
    }

    const confirmPassword = await bcrypt.compare(password, userExist.password);

    if (!confirmPassword) {
      return res.json({
        message: 'Invalid credentials',
        status: 400,
        success: false,
      });
    }

    if (userExist.isVerified === false) {
      const checkToken = await Token.findOne({
        userId: userExist._id,
      });

      if (checkToken) {
        const link = `${process.env.FRONTEND_URL}/email-verification/?userId=${checkToken.userId}&token=${checkToken.token}`;

        const body = {
          link: link,
          firstName: userExist.firstName,
          email: userExist.email,
          userId: userExist._id,
          messageTitle: 'Email Verification',
        };

        await sendMessageToQueue(body);

        return res.json({
          message: `${userExist.firstName}, Please check your email for verification link`,
          success: false,
        });
      } else {
        const token =
          crypto.randomBytes(32).toString('hex') +
          crypto.randomBytes(32).toString('hex');

        const newToken = await new Token({
          userId: userExist._id,
          token,
        }).save();

        const link = `${process.env.FRONTEND_URL}/email-verification/?userId=${newToken.userId}&token=${newToken.token}`;

        const body = {
          link: link,
          firstName: userExist.firstName,
          email: userExist.email,
          userId: userExist._id,
          messageTitle: 'Email Verification',
        };

        const response = await sendMessageToQueue(body);

        return res.json({
          message: `${userExist.firstName}, Please check your email for verification link`,
          success: false,
        });
      }
    }

    const generatedToken = await generateToken(res, userExist);

    const { password: hashedPassword, ...others } = userExist._doc;

    return res.json({
      message: 'Login successful',
      status: 200,
      success: true,
      user: others,
      info: generatedToken,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({
        message: 'Email is required',
        success: false,
        status: 400,
      });
    }

    const emailExist = await User.findOne({
      email,
    });

    if (!emailExist) {
      return res.json({
        message: 'User not found',
        status: 404,
        success: false,
      });
    }

    const token =
      crypto.randomBytes(32).toString('hex') +
      crypto.randomBytes(32).toString('hex');

    const newToken = await Token({
      userId: emailExist._id,
      token,
    }).save();

    const link = `${process.env.FRONTEND_URL}/reset-password/?userId=${newToken.userId}&token=${newToken.token}`;

    const body = {
      link: link,
      firstName: emailExist.firstName,
      email: emailExist.email,
      userId: emailExist._id,
      messageTitle: 'reset password',
    };

    await sendMessageToQueue(body);

    return res.json({
      message: 'Please check your email for password reset link',
      status: 200,
      success: true,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const allowResetPassword = async (req, res) => {
  try {
    const { userId, token } = req.params;

    const checkToken = await Token.findOne({
      userId,
      token,
    });

    if (!checkToken) {
      return res.json({
        error: 'Token not found',
        success: false,
        status: 404,
      });
    }
    return res.json({
      message: 'User and token found',
      status: 200,
      success: true,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { userId, token } = req.params;
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      return res.json({
        error: 'All fields are required',
        success: false,
        status: 400,
      });
    }

    if (
      !/^(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,20}$/.test(
        password
      )
    ) {
      return res.json({
        error:
          'Password must contain at least 1 special character, 1 lowercase letter, and 1 uppercase letter. Also it must be minimum of 8 characters and maximum of 20 characters',
        success: false,
        status: 401,
      });
    }

    if (password !== confirmPassword) {
      return res.json({
        ErrorEvent: 'Password and confirm password do not match',
        status: 400,
        success: false,
      });
    }

    const checkToken = await Token.findOne({
      userId,
      token,
    });

    if (!checkToken) {
      return res.json({
        error: 'Token not found',
        success: false,
        status: 404,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const findUser = await User.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $set: {
          password: hashedPassword,
        },
      },
      { new: true }
    );

    if (!findUser) {
      return res.json({
        error: 'Unable to find and update user',
        success: false,
        status: 404,
      });
    }

    const { password: hashedPassword2, ...others } = findUser._doc;

    return res.json({
      message: `${others.firstName}, Password updated successfully`,
      status: 200,
      success: true,
      user: others,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { email, lastName, firstName, userName } = req.body;
    const file = req.file;

    if (!lastName || !firstName || !userName) {
      return res.json({
        message: 'All fields are required',
        status: 400,
        success: false,
      });
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedUserName = userName.trim();

    if (trimmedFirstName !== '') {
      if (forbiddenCharsRegex.test(trimmedFirstName)) {
        return res.json({
          message: `Invalid character for field first name`,
          status: 400,
          success: false,
        });
      }
    }

    if (trimmedLastName !== '') {
      if (forbiddenCharsRegex.test(trimmedLastName)) {
        return res.json({
          message: `Invalid character for field last name`,
          status: 400,
          success: false,
        });
      }
    }

    if (trimmedUserName !== '') {
      if (forbiddenCharsRegex.test(trimmedUserName)) {
        return res.json({
          message: `Invalid character for field user name`,
          status: 400,
          success: false,
        });
      }
    }

    const user = req.user;

    if (user._id !== req.params._id) {
      return res.json({
        message: 'You can only update your account',
        status: 400,
        success: false,
      });
    }

    let userMatch = await User.findOne({
      _id: req.params.id,
    });

    if (!userMatch) {
      return res.json({
        message: 'User can not be found',
        success: false,
        status: 404,
      });
    }

    const userNameExist = await User.findOne({
      userName: trimmedUserName,
    });

    if (userNameExist !== null) {
      if (userNameExist.userName !== userMatch.userName) {
        return res.json({
          message: 'Username already exist',
          status: 400,
          success: false,
        });
      }
    }

    if (file && file !== undefined) {
      if (userMatch.image && userMatch.image !== null) {
        // remove the existing image
        const deleteImage = await s3DeleteImageUrl(userMatch.image.imageKey);

        console.log('deletedImage:', deleteImage);

        if (!deleteImage) {
          return res.json({
            message: 'Unable to delete image from S3 bucket',
          });
        }

        // upload new one and store in the database
        const result = await s3UploadImage(file);

        const response = await s3GetImageUrl(result);

        const separated = response.url.split('?');

        const imageDetails = {
          url: separated[0],
          imageKey: result.imageKey,
          ETag: result.response.ETag,
        };

        userMatch.image = imageDetails;
      } else {
        // just upload the new image and store

        const result = await s3UploadImage(file);

        const response = await s3GetImageUrl(result);

        const separated = response.url.split('?');

        const imageDetails = {
          url: separated[0],
          imageKey: result.imageKey,
          ETag: result.response.ETag,
        };
        userMatch.image = imageDetails;
      }
    }

    userMatch.firstName = trimmedFirstName || userMatch.firstName;
    userMatch.lastName = trimmedLastName || userMatch.lastName;
    userMatch.userName = trimmedUserName || userMatch.userName;

    userMatch = await userMatch.save();

    if (!userMatch) {
      return res.json({
        message: 'Unable to update user profile',
        status: 400,
        success: false,
      });
    }

    const { hashedPassword: password, ...others } = userMatch._doc;

    const deleteFileInUploadFolder = await fs.unlinkSync(file.path);
    if (deleteFileInUploadFolder) {
      console.log('Unable to delete file from upload folder');
    }

    return res.json({
      message: 'User profile updated successfully',
      success: true,
      status: 200,
      user: others,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const userLogout = res.cookie('token', '', { maxAge: 1 });
    if (!userLogout) {
      return res.json({
        message: 'Unable to log user out',
        status: 400,
        success: false,
      });
    }

    return res.json({
      message: 'User logged out successfully',
      status: 200,
      success: true,
    });
  } catch (error) {
    return res.json({
      message: 'Something happened',
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

export {
  allowResetPassword,
  logout,
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyUser,
  updateUser,
};
