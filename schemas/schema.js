import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLID, GraphQLError, GraphQLNonNull } from "graphql";
import { User, Company } from "../database/models.js";

const companyType = new GraphQLObjectType({
    name: "Company",
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        users: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(userType))),
            resolve: async (parent, args, context) => {
                if (!parent.users || parent.users.length === 0) return [];
                const users = await context.userLoader.loadMany(parent.users);
                return users.filter(u => u != null); // filter out if not found
            }
        }
    })
});

const userType = new GraphQLObjectType({
    name: "User",
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        email: { type: GraphQLString },
        companies: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(companyType))),
            resolve: async (parent, args, context) => {
                if (!parent.companies || parent.companies.length === 0) return [];
                const companies = await context.companyLoader.loadMany(parent.companies);
                return companies.filter(c => c != null);
            }
        }
    })
});

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "Query",
        fields: {
            users: {
                type: new GraphQLList(userType),
                resolve: async () => {
                    return await User.find();
                }
            },
            user: {
                type: userType,
                args: { id: { type: new GraphQLNonNull(GraphQLID) } },
                resolve: async (_, args) => {
                    return await User.findById(args.id);
                }
            },
            companies: {
                type: new GraphQLList(companyType),
                resolve: async () => {
                    return await Company.find();
                }
            },
            company: {
                type: companyType,
                args: { id: { type: new GraphQLNonNull(GraphQLID) } },
                resolve: async (_, args) => {
                    return await Company.findById(args.id);
                }
            }
        }
    }),
    mutation: new GraphQLObjectType({
        name: "Mutation",
        fields: {
            // User CRUD
            createUser: {
                type: userType,
                args: {
                    name: { type: new GraphQLNonNull(GraphQLString) },
                    email: { type: new GraphQLNonNull(GraphQLString) },
                    companies: { type: new GraphQLList(GraphQLID) }
                },
                resolve: async (_, args) => {
                    const user = await User.create({
                        name: args.name,
                        email: args.email,
                        companies: args.companies || []
                    });
                    if (args.companies && args.companies.length > 0) {
                        await Company.updateMany(
                            { _id: { $in: args.companies } },
                            { $push: { users: user._id } }
                        );
                    }
                    return user;
                }
            },
            updateUser: {
                type: userType,
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                    name: { type: GraphQLString },
                    email: { type: GraphQLString },
                    companies: { type: new GraphQLList(GraphQLID) }
                },
                resolve: async (_, args) => {
                    const oldUser = await User.findById(args.id);
                    if (!oldUser) throw new GraphQLError("User not found");

                    if (args.companies) {
                        // Remove user from old companies
                        await Company.updateMany(
                            { _id: { $in: oldUser.companies } },
                            { $pull: { users: oldUser._id } }
                        );
                    }

                    const user = await User.findByIdAndUpdate(args.id, args, { new: true });

                    if (args.companies && args.companies.length > 0) {
                        // Add user to new companies
                        await Company.updateMany(
                            { _id: { $in: user.companies } },
                            { $push: { users: user._id } }
                        );
                    }
                    return user;
                }
            },
            deleteUser: {
                type: userType,
                args: { id: { type: new GraphQLNonNull(GraphQLID) } },
                resolve: async (_, args) => {
                    const user = await User.findByIdAndDelete(args.id);
                    if (user && user.companies && user.companies.length > 0) {
                        await Company.updateMany(
                            { _id: { $in: user.companies } },
                            { $pull: { users: user._id } }
                        );
                    }
                    return user;
                }
            },
            
            // Company CRUD
            createCompany: {
                type: companyType,
                args: {
                    name: { type: new GraphQLNonNull(GraphQLString) },
                    users: { type: new GraphQLList(GraphQLID) }
                },
                resolve: async (_, args) => {
                    const company = await Company.create({
                        name: args.name,
                        users: args.users || []
                    });
                    if (args.users && args.users.length > 0) {
                        await User.updateMany(
                            { _id: { $in: args.users } },
                            { $push: { companies: company._id } }
                        );
                    }
                    return company;
                }
            },
            updateCompany: {
                type: companyType,
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                    name: { type: GraphQLString },
                    users: { type: new GraphQLList(GraphQLID) }
                },
                resolve: async (_, args) => {
                    const oldCompany = await Company.findById(args.id);
                    if (!oldCompany) throw new GraphQLError("Company not found");

                    if (args.users) {
                        await User.updateMany(
                            { _id: { $in: oldCompany.users } },
                            { $pull: { companies: oldCompany._id } }
                        );
                    }

                    const company = await Company.findByIdAndUpdate(args.id, args, { new: true });

                    if (args.users && args.users.length > 0) {
                        await User.updateMany(
                            { _id: { $in: company.users } },
                            { $push: { companies: company._id } }
                        );
                    }
                    return company;
                }
            },
            deleteCompany: {
                type: companyType,
                args: { id: { type: new GraphQLNonNull(GraphQLID) } },
                resolve: async (_, args) => {
                    const company = await Company.findByIdAndDelete(args.id);
                    if (company && company.users && company.users.length > 0) {
                        await User.updateMany(
                            { _id: { $in: company.users } },
                            { $pull: { companies: company._id } }
                        );
                    }
                    return company;
                }
            }
        }
    })
});

export default schema;
