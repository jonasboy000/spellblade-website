import express, { Request, Response } from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3001;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req: Request, res: Response) => {
  res.render("index", { title: "Home", currentPage: "home" });
});

app.get("/world/western-provinces", (req: Request, res: Response) => {
  res.render("western-provinces", {
    title: "The Western Provinces",
    currentPage: "world",
    extraCss: "world.css",
    extraHead: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
    `,
  });
});

app.get("/world/iomhrathill", (req: Request, res: Response) => {
  res.render("iomhrathill", {
    title: "Iomhrathill",
    currentPage: "world",
  });
});

app.listen(PORT, () => {
  console.log(`Spellblade running on http://localhost:${PORT}`);
});
