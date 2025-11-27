import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit : "50mb"}));
app.use(express.urlencoded({extended : true,limit : "50mb"}));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import orgRoutes from "./routes/org.routes.js";
import authRoutes from "./routes/auth.routes.js";

app.get("/test", (req, res) => {
  res.status(200).json({ message: "Server is working! 🎯" });
});


app.use("/org", orgRoutes);
app.use("/admin", authRoutes);





export {app};