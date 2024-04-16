import express from 'express';
import cookieParser from 'cookie-parser';
import DBConfig from './DBConfig.js';
import colors from 'colors';
import userRoutes from './routes/userRoutes.js';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

const port = process.env.PORT || 3300;

app.use('/api/user', userRoutes);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`.bold.blue);
});
