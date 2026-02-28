import { mount, Uses } from "wallace";

interface iGreeting {
  msg: string;
  name: string;
}

const Greeting: Uses<iGreeting> = ({ msg, name }) => (
  <div>
    {name} says {msg}!!!!
  </div>
);

async function load() {
  // await dbx.saveJson("/myfile.json", { food: "candles" });
  const myfile = await dbx.fetchJson("/myfile.json");
  console.log("myfiless", myfile);
  mount("app", Greeting, { msg: "hello", name: "Wallace" });
}
load();
