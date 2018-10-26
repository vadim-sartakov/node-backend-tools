import mongoose from "mongoose";
import sessionSchema from "./session";
import userSchema from "./user";
import clientSchema from "./client";
import tokenSchema from "./token";
import authorizationCodeSchema from "./authorizationCode";

const loadModels = () => {
    mongoose.model("Session", sessionSchema);
    mongoose.model("User", userSchema);
    mongoose.model("Client", clientSchema);
    mongoose.model("Token", tokenSchema);
    mongoose.model("AuthorizationCode", authorizationCodeSchema);
};
export default loadModels;