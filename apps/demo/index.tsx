import { mount, Uses, watch } from "wallace";
import { dbx } from "../../lib/dropbox";
interface iTask {
  title: string;
  done: boolean;
  id: number;
}

const Task: Uses<iTask> = ({ title, done, id }) => (
  <div>
    <span>{title}</span>
    <input type="checkbox" bind:checked={done} />
  </div>
);
let duration = 0;

const TaskList: Uses<iTask[]> = (tasks) => (
  <div>
    <h3>Tasks with update</h3>
    <div>Duration: {duration}</div>
    <Task.repeat props={tasks} />
    <button onClick={addData()}>add</button>
  </div>
);

// async function load() {
//   // await dbx.saveJson("/myfile.json", { food: "candles" });
//   const myfile = await dbx.fetchJson("/myfile.json");
//   console.log("myfiless", myfile);
//   mount("app", Task, { msg: "hello", name: "Wallace" });
// }
// load();

let settings;
const start = performance.now();
window.onload = function () {
  const root = mount("app", TaskList, []);
  dbx.getJson("/tasks.json").then((res) => {
    duration = performance.now() - start;
    settings = res;
    const tasks = watch(settings.tasks, () => {
      dbx.putJson("/tasks.json", settings);
      root.update();
    });
    root.render(tasks);
  });
};

const addData = () => {
  settings.other = Array(1000)
    .fill(0)
    .map((_, i) => ({
      task: `task ${i}`,
      done: i % 2 === 0,
    }));
  dbx.putJson("/tasks.json", settings);
};
