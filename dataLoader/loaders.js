import DataLoader from "dataloader";
import { User, Company } from "../database/models.js";

const companyLoader = new DataLoader(async (companyIds) => {
    const companies = await Company.find({ _id: { $in: companyIds } });
    return companyIds.map(id => companies.find(c => c._id.toString() === id.toString()));
});

const userLoader = new DataLoader(async (userIds) => {
    const users = await User.find({ _id: { $in: userIds } });
    return userIds.map(id => users.find(u => u._id.toString() === id.toString()));
});

export { companyLoader, userLoader };
