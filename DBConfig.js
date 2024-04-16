import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DBConfig = mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log(`MongoDB connected to host ${mongoose.connection.host}`.bold);
  })
  .catch((err) => {
    console.log(err.message);
    process.exit(1);
  });

export default DBConfig;
