
import express from "express";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

app.listen(process.env.PORT || 3000, () => {
  console.log("RESIST TikTok running");
});
