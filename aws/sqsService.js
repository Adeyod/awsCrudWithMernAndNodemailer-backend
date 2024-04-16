import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { resetPasswordMessage, verifyEmail } from '../utils/nodemailer.js';

const region = process.env.AWS_REGION;
const accessKey = process.env.AWS_ACCESS_KEY_ID_SQS;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY_SQS;
const queueUrl = process.env.AWS_QUEUE_URL;

const sqsClient = new SQSClient({
  region: region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

const sendMessageToQueue = async (body) => {
  try {
    const message = JSON.stringify(body);

    const input = {
      QueueUrl: queueUrl,
      MessageBody: message,

      MessageAttributes: {
        messageId: { DataType: 'String', StringValue: body.userId },
      },
    };

    const command = new SendMessageCommand(input);

    const response = await sqsClient.send(command);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
};

const deleteMessageFromQueue = async (ReceiptHandle) => {
  try {
    const input = {
      QueueUrl: queueUrl,
      ReceiptHandle: ReceiptHandle,
    };
    const command = new DeleteMessageCommand(input);
    const response = await sqsClient.send(command);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
};

const pollMessageFromQueue = async () => {
  try {
    const input = {
      QueueUrl: queueUrl,
      MessageAttributeNames: ['All'],
      WaitTimeSeconds: 20,
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 30,
    };

    const command = new ReceiveMessageCommand(input);
    const response = await sqsClient.send(command);
    const messages = response.Messages;
    // console.log('messages:', messages);
    // console.log('response:', response);
    if (messages && messages.length > 0) {
      messages.forEach(async (message) => {
        const data = JSON.parse(message.Body);

        const { email, link, firstName, userId, messageTitle } = data;

        if (messageTitle.toLowerCase() === 'reset password') {
          console.log('link:', link);
          const sendMail = await resetPasswordMessage({
            email,
            link,
            firstName,
          });
          if (sendMail) {
            await deleteMessageFromQueue(message.ReceiptHandle);
            console.log('message deleted successfully');
          } else {
            return null;
          }
        } else if (messageTitle.toLowerCase() === 'email verification') {
          console.log('userId:', userId);
          const sendMail = await verifyEmail({ email, link, firstName });
          if (sendMail) {
            await deleteMessageFromQueue(message.ReceiptHandle);
            console.log('message deleted successfully');
          } else {
            return null;
          }
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
};

// await setInterval(pollMessageFromQueue, 30000);

export { sendMessageToQueue, pollMessageFromQueue };
