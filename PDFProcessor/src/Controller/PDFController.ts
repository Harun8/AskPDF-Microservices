// Import necessary modules using ES syntax
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import dotenv from "dotenv";
import pdf from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import express, {Request, Response} from 'express';
import multer from "multer";

// Initialize environment variables
dotenv.config();

// Initialize Supabase and OpenAI clients outside the handler to reuse across invocations
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions
async function parsePDF(buffer: Buffer) {
  return await pdf(buffer);
}

async function splitText(text: any, chunkSize: number, chunkOverlap: number) {

  console.log("inserting chunksize: ", chunkSize)
  console.log("inserting chunkoverlap: ", chunkOverlap)
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    separators: ["\n\n", "\n", " ", ""],
    chunkOverlap: chunkOverlap,
  });
  const result = await splitter.createDocuments([text]);

  if (result.length === 0) {
    return null;
  }
  return result;
}

function getChunkSettings(pageCount: number) {
  if (pageCount <= 10) {
    return { chunkSize: 500, chunkOverlap: 50 };
  } else if (pageCount <= 50) {
    return { chunkSize: 1000, chunkOverlap: 100 };
  } else {
    return { chunkSize: 2000, chunkOverlap: 200 };
  }
}


const BATCH_SIZE = 100; // Adjust as needed

async function createEmbeddings(documents: any) {
  if (!documents || documents.length === 0) {
    return [];
  }

  const parallelEmbeddings = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batchDocs = documents.slice(i, i + BATCH_SIZE);
    parallelEmbeddings.push(
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batchDocs.map((doc:any) => doc.pageContent),
      })
    );
  }

  // Run all embedding requests in parallel
  const results = await Promise.all(parallelEmbeddings);

  // Flatten all results into a single array of embeddings
  const allEmbeddings = results.flatMap((result) => 
    result.data.map((item) => item.embedding)
  );

  return allEmbeddings;
}


async function insertChat(userId: number) {
  const { data, error } = await supabase
    .from("chats")
    .insert([{ user_id: userId }])
    .select();
  if (error) throw error;
  return data[0].id;
}

async function insertDocuments(documents: any, embeddings: any, userId: number, fileId: number, chatId: number) {
  const documentsWithForeignKeys = documents.map((doc: any, index:any) => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    embedding: embeddings[index],
    user_id: userId,
    file_id: fileId,
    chat_id: chatId,
  }));

  const { data, error } = await supabase
    .from("documents")
    .insert(documentsWithForeignKeys);

  if (error) throw error;
  return data;
}

// Main handler
export const maxDuration = 60;

async function getPageCount(buffer: Buffer) {
  const pdfData = await pdf(buffer);
  return pdfData.numpages;
}

const upload = multer(); // Use memory storage for small files

export const PDF = async (req: Request, res: Response): Promise<any> => { 
  
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: "File upload error", error: err.message });
    }

    try {
      const { file_id, file_title, userId } = req.body;
      console.log(file_id, file_title, userId)
      const file = req.file;

      if (!file || !file_id || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const buffer = file.buffer;
      const pdfData = await parsePDF(buffer);
      const pageCount = await getPageCount(buffer);
      const { chunkSize, chunkOverlap } = getChunkSettings(pageCount);

      console.log("pageCount", pageCount);

      // Split PDF text into documents (chunks)
      const documents = await splitText(pdfData.text, chunkSize, chunkOverlap);
      if (!documents) {
        return res.status(400).json({ message: "No embedding created" });
      }

      // Create embeddings in batches
      const embeddings = await createEmbeddings(documents);

      // Insert a new chat row
      const chatId = await insertChat(userId);

      // Insert documents and embeddings into the database
      await insertDocuments(documents, embeddings, userId, file_id, chatId);

      return res.json({
        message: "PDF processed successfully",
        pdfIds: file_id,
        chatId: chatId,
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      return res.status(500).json({
        message: "Failed to process PDF",
        error: (error as Error).message,
      });
    }
  });
};
