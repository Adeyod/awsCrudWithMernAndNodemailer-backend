import mongoose from 'mongoose';

const imageDetails = {
  url: String,
  imageKey: String,
  ETag: String,
};

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    userName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    image: { type: imageDetails },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
