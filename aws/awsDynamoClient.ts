import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  // If you want explicit credentials instead of the default chain, uncomment:
  // credentials: {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  // },
});
