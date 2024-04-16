## USING AWS SQS, S3, NODEMAILER WITH MERNSTACK FOR CRUD OPERATION

This is the backend for the aws s3 image upload and also aws sqs for queuing and i use nodemailer to send the mails in MERNSTACK.

# Features and npm packages

1. @aws-sdk/client-s3 - this is used to connect with my AWS s3 account so as to be able to do the image crud operation.

1. s3-request-presigner: this is used to get the URL location of the uploaded image.

1. Nodemailer: this is used for sending mails to users.

1. dotenv - this is used to store all sensitive keys.

1. mongoose - this is used to connect my server with mongoDB database.

1. multer - this is used to pick the images that need to be uploaded and from this package, it is sent to AWS.

1. uuid - this is used to assign a unique value to each image.

# Prerequisites

Before running the project, make sure you have the following packages installed:

1. Node.js
1. npm or yarn package manager

# Installation

1. Clone the repository.
1. Install dependencies.
1. Configure environment variables
