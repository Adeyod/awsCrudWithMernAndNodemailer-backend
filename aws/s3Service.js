import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

const s3UploadImage = async (file) => {
  const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
  const path = file.path;
  const fileBuffer = await fs.promises.readFile(path);
  const key = `uploads/${uniqueSuffix}-${file.originalname}`;

  try {
    const params = {
      Body: fileBuffer,
      Bucket: bucketName,
      Key: key,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    return { response, imageKey: params.Key };
  } catch (error) {
    console.log(error.message);
  }
};

const s3GetImageUrl = async (file) => {
  try {
    const key = file.imageKey;
    const input = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new GetObjectCommand(input);
    const url = await getSignedUrl(s3Client, command);
    return { url, key };
  } catch (error) {
    console.log(error.message);
  }
};

const s3DeleteImageUrl = async (key) => {
  try {
    const input = {
      Bucket: bucketName,
      Key: key,
    };
    const command = new DeleteObjectCommand(input);
    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    console.log(error.message);
  }
};

export { s3UploadImage, s3GetImageUrl, s3DeleteImageUrl };
