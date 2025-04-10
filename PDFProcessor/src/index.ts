import express from "express";

const app = express();
import cors from "cors";
import { SupabaseClient } from "@supabase/supabase-js";

import ChatRoute from "./Route/PDFRoute";

const port: number = 3002;

const corsOptions = {
  origin: "http://localhost:3000", // Maps to the host machine's localhost
  credentials: true, // Allow credentials (cookies, etc.) to be sent
};

app.use((req, res, next) => {
  console.log("Received in PDFProcessor:", req.method, req.url);
  next();
});


app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight

// app.use(cors());

// app.use(cookieParser()); 

app.use(express.json());
// app.use("/api/v1", FileRoute);
app.use("", ChatRoute);

app.listen(port, () => {
  console.log("PDF Microservice running on port:  ", port);
  console.log("supbaseClient", SupabaseClient);
});

// const dbConnection = async () => {
//   try {
//     await db();
//   } catch (error) {
//     console.error("Database connection or migration failed:", error);
//   } finally {
//     // await client.end(); // Ensure the client is properly closed
//   }
// };

// Ensure dbConnection is called once and only after the server is running
// dbConnection().catch(console.error);