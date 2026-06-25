import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import connectDB from "./database/connection.js";
import schema from "./schemas/schema.js";
import { companyLoader, userLoader } from "./dataLoader/loaders.js";

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/graphql', graphqlHTTP((req, res) => {
    return {
        schema,
        graphiql: true,
        context: {
            companyLoader,
            userLoader
        }
    };
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
