import { ChatOpenAI } from "@langchain/openai";
import { modelChooser } from "../utils/modelChooser";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PassThrough } from "stream";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import combineDocuments from "../utils/combineDocuments";
import formatConvHistory from "../utils/formatConvHistory";
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
import { Request, Response } from "express";
import 'dotenv/config'

const standAloneQuestionTemplate = `Given some conversation history (if any) and a question, convert it into a standalone question. 
conversation history: {conv_history}

question: {question} 
standalone question:`;

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  standAloneQuestionTemplate
);

const answerTemplate = `You're a helpful and enthusiastic suppport bot who can answer a given question about the context provided,
and the conversation history. 
 Try to find the answer in the context.
 Do not try to make up an answer. Always speak as if you were chatting to a friend.
 context: {context}
 conversation history: {conv_history}
 question: {question}
 answer:
  `;

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    config: {
      broadcast: { ack: true },
    },
  }
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // api key
});


let channelB;

export const Chat = async (req: Request, res: Response): Promise<any> => {
  try {
    const data= req.body; // Assuming text data if not form data
    console.log("Received data in ChatProcessor:", data, req.body);
    console.log("Received data in ChatProcessor:", data.sessionId);

    channelB = client.channel(`session-${data.sessionId}`);

    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: modelChooser(data.plan),
      streaming: true,
      //  temperature: 0.5
    });

    const standaloneQuestionchain = standaloneQuestionPrompt
      .pipe(llm)
      .pipe(new StringOutputParser());

    const retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.standalone_question,
      (prevResult) => retriver(prevResult, data.file_id),
      combineDocuments,
    ]);

    const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

    const chain = RunnableSequence.from([
      {
        standalone_question: standaloneQuestionchain,
        original_input: new RunnablePassthrough(),
      },
      {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history,
      },
      answerChain,
    ]);

    const response = await chain.stream({
      question: data.messageText,
      conv_history: await formatConvHistory(data.conv_history),
    });

    for await (const chunk of response) {
      await channelB.send({
        type: "broadcast",
        event: "acknowledge",
        payload: { message: chunk },
      });
    }
    client.removeChannel(channelB);

    return res.status(200).json({ msg: "PDF RECEIVED IT IS BEING PROCESSED" });

  } catch (error) {
    console.log(error);
    return res.status(400).json({ error});


  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function retriver(queryText: string, file_id: string) {
  const model: string = "text-embedding-3-small";
  // Generate the embedding vector for the query text
  let queryEmbedding;
  try {
    const embeddingResult = await openai.embeddings.create({
      model: model,
      input: queryText,
    });
    if (embeddingResult.error) {
      console.error("Error generating embeddings:", embeddingResult.error);
      return [];
    }
    queryEmbedding = embeddingResult.data[0].embedding; // Adjust this line based on the actual structure of the response
  } catch (error) {
    console.error("Error during embedding generation:", error);
    return [];
  }
  // Now use the generated embedding as query_embedding in the RPC call
  const { data, error } = await supabase.rpc("match_documents", {
    file_id: file_id,
    filter: {},
    match_count: 10,
    query_embedding: queryEmbedding,
  });

  if (error) {
    console.error("Error searching for documents:", error);
    return [];
  }

  console.log(data);

  return data || [];
}
