import { mount, Uses } from "wallace";
import { fetchFile } from "../../lib/dropbox";
interface iTask {
  msg: string;
  name: string;
}

const Task: Uses<iTask> = ({ title, done, id }) => (
  <div>
    <span>{title}</span> ({id})
    <input type="checkbox" checked={done} />
  </div>
);

const TaskList: Uses<iTask[]> = (tasks) => (
  <div>
    <Task.repeat props={tasks} />
  </div>
);

// async function load() {
//   // await dbx.saveJson("/myfile.json", { food: "candles" });
//   const myfile = await dbx.fetchJson("/myfile.json");
//   console.log("myfiless", myfile);
//   mount("app", Task, { msg: "hello", name: "Wallace" });
// }
// load();

fetchFile("/tasks.json").then((settings) => {
  console.log("settings", settings);
  mount("app", TaskList, JSON.parse(settings).tasks);
});
