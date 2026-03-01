import { mount, Uses, watch } from "wallace";
import { dbx } from "../../lib/dropbox";
interface iTask {
  msg: string;
  name: string;
}

const Task: Uses<iTask> = ({ title, done, id }) => (
  <div>
    <span>{title}</span> ({id})
    <input type="checkbox" bind:checked={done} />
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

window.onload = function () {
  const root = mount("app", TaskList, []);
  dbx.getJson("/tasks.json").then((settings) => {
    const tasks = watch(settings.tasks, () => {
      dbx.putJson("/tasks.json", settings);
      root.update();
    });
    root.render(tasks);
  });
};
