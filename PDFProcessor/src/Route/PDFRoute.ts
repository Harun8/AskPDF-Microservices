import express from "express";
import { PDF } from "../Controller/PDFController";
const router = express.Router();


router.route("/pdf").post(PDF);

export default router;