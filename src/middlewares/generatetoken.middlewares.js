import { User } from "../models/user.model.js";
import { Apierror } from "../utils/apierror.js";

const generatetoken = async (userid) => {
  try {
    const user = await User.findById(userid);
    const accesstoken = await user.generateaccesstoken();
    const refreshtoken = await user.generaterefreshtoken();

    user.refreshtoken = refreshtoken;
    await user.save({ validateBeforeSave: false });
    return { accesstoken, refreshtoken };
  } catch (error) {
    throw new Apierror(500, "generate access or refresh error");
  }
};

export { generatetoken };
