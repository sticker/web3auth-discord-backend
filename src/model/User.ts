import * as dynamoose from "dynamoose";
import { Item } from "dynamoose/dist/Item";

export interface IUser extends Item {
  discordId: string;
  discordName: string;
  walletAddress?: string;
}

const userSchema = new dynamoose.Schema(
  {
    discordId: {
      type: String,
      hashKey: true,
    },
    discordName: String,
    walletAddress: String,
  },
  {
    saveUnknown: true,
    timestamps: true,
  }
);

if (process.env.IS_OFFLINE) {
  console.log("IS_OFFLINE");
  dynamoose.aws.ddb.local("http://localhost:8000");
}

const UserPrdModel = dynamoose.model<IUser>(
  "UserPrd",
  userSchema,
  { create: false }
);
const UserDevModel = dynamoose.model<IUser>(
  "UserDev",
  userSchema,
  { create: false }
);
export const UserModel =
  process.env.NODE_ENV === "development" ? UserDevModel : UserPrdModel;
