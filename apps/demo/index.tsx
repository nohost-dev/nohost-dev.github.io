import { mount, Uses } from "wallace";
import { Dropbox } from "dropbox";
interface iGreeting {
  msg: string;
  name: string;
}

// const Greeting: Uses<iGreeting> = ({ msg, name }) => (
//   <div>
//     {name} says {msg}!!!!
//   </div>
// );

// async function load() {
//   // await dbx.saveJson("/myfile.json", { food: "candles" });
//   const myfile = await dbx.fetchJson("/myfile.json");
//   console.log("myfiless", myfile);
//   mount("app", Greeting, { msg: "hello", name: "Wallace" });
// }
// load();

const ACCESS_TOKEN = "f57qgf4puqhz5wi";
var dbx = new Dropbox({ accessToken: ACCESS_TOKEN });
dbx
  .usersGetCurrentAccount()
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.error(error);
  });
