let tasks=[];let editTaskId=null;const elements={list:document.getElementById("list"),title:document.getElementById("title"),date:document.getElementById("date"),priority:document.getElementById("priority"),category:document.getElementById("category"),description:document.getElementById("description"),search:document.getElementById("search"),total:document.getElementById("total"),done:document.getElementById("done"),pending:document.getElementById("pending"),addBtn:document.getElementById("addBtn"),clearBtn:document.getElementById("clearBtn"),themeBtn:document.getElementById("themeBtn"),toastBox:document.getElementById("toast"),inputCard:document.querySelector(".input-card")};const titleInput=elements.title;window.addEventListener("DOMContentLoaded",init);async function init(){bindEvents();await loadTasks()}
async function request(url="",options={}){const response=await fetch(`${API}${url}`,{headers:{"Content-Type":"application/json"},...options});if(!response.ok){throw new Error("Request Failed")}
if(response.status===204)return null;return response.json()}
async function loadTasks(){try{tasks=await request();renderTasks();updateStats()}catch(err){toast("Server not connected","error");console.error(err)}}
function getFormData(){return{title:elements.title.value.trim(),date:elements.date.value,priority:elements.priority.value,category:elements.category.value,description:elements.description.value.trim()}}
async function saveTask(){const task=getFormData();if(!task.title){toast("Enter task title","error");return}
try{if(editTaskId===null){await request("",{method:"POST",body:JSON.stringify({...task,done:!1})})}else{const existing=tasks.find(t=>t.id===editTaskId);await request(`/${editTaskId}`,{method:"PUT",body:JSON.stringify({...existing,...task})});toast("Task Updated");editTaskId=null;elements.addBtn.innerText="➕ Add Task"}
await loadTasks();clearForm()}catch(err){console.error(err);toast("Error saving task","error")}}
async function del(id){try{await request(`/${id}`,{method:"DELETE"});toast("Task Deleted","error");await loadTasks()}catch(err){toast("Delete Failed","error")}}
async function toggleTask(id){const task=tasks.find(t=>t.id===id);if(!task)return;try{await request(`/${id}`,{method:"PUT",body:JSON.stringify({...task,done:!task.done})});await loadTasks()}catch{toast("Unable to update task","error")}}
function editTask(id){const task=tasks.find(t=>t.id===id);if(!task)return;elements.title.value=task.title;elements.date.value=task.date;elements.priority.value=task.priority;elements.category.value=task.category;elements.description.value=task.description;editTaskId=id;elements.addBtn.innerText="✏ Update Task";expandCard()}
window.del=del;window.editTask=editTask;window.toggleTask=toggleTask;function renderTasks(data=tasks){if(!data.length){elements.list.innerHTML=`
      <p class="opacity-60 text-sm font-medium italic py-4">
        No tasks found in your system.
      </p>
    `;return}
elements.list.innerHTML=data.map(task=>createTaskCard(task)).join("")}
function createTaskCard(task){const priorityBadge={High:{color:"bg-red-100 text-red-700 border-red-300",icon:"🔴"},Medium:{color:"bg-yellow-100 text-yellow-700 border-yellow-300",icon:"🟡"},Low:{color:"bg-green-100 text-green-700 border-green-300",icon:"🟢"}};const categoryBadge={Work:"💼",Study:"📚",Personal:"🏠",General:"📌"};const priority=priorityBadge[task.priority]||priorityBadge.Low;const categoryIcon=categoryBadge[task.category]||"📌";return `
    <div class="task w-full ${task.done ? "done" : ""}">

      <div class="flex-1 min-w-0 pr-4">

        <div class="flex flex-wrap items-center gap-2 mb-1.5">

          <b class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 break-words">
            ${task.title}
          </b>

          <span class="text-[11px] font-bold px-2.5 py-1 rounded-full border ${priority.color}">
             ${priority.icon} ${task.priority}
          </span>

         <span class="text-[11px] font-bold px-2.5 py-1 rounded-full
          bg-slate-100 dark:bg-slate-700
          text-slate-700 dark:text-slate-200
          border border-slate-300 dark:border-slate-600">
              ${categoryIcon} ${task.category}
          </span>

        </div>

       <p class="
            text-sm
            text-slate-600
            dark:text-slate-300
            mb-2
            leading-relaxed
            whitespace-pre-wrap
            break-words
            break-all
            overflow-hidden
        ">
            ${task.description || "No description provided."}
        </p>

        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
          📅 ${task.date || "No Date"}
        </div>

      </div>

      <div class="flex sm:flex-col md:flex-row gap-2 self-end sm:self-center shrink-0">

        <button
          onclick="toggleTask(${task.id})"
          class="bg-emerald-600 hover:bg-emerald-500 shadow-sm"
          title="Complete Task">
          ✔
        </button>

        <button
          onclick="editTask(${task.id})"
          class="bg-amber-500 hover:bg-amber-400 shadow-sm"
          title="Edit Task">
          ✏
        </button>

        <button
          onclick="del(${task.id})"
          class="bg-rose-600 hover:bg-rose-500 shadow-sm"
          title="Delete Task">
          🗑
        </button>

      </div>

    </div>
  `}
function searchTasks(){const keyword=elements.search.value.trim().toLowerCase();const filtered=tasks.filter(task=>task.title.toLowerCase().includes(keyword));renderTasks(filtered)}
function updateStats(){const completed=tasks.filter(task=>task.done).length;elements.total.textContent=tasks.length;elements.done.textContent=completed;elements.pending.textContent=tasks.length-completed}
function clearForm(){elements.title.value="";elements.date.value="";elements.description.value="";elements.priority.selectedIndex=0;elements.category.selectedIndex=0;editTaskId=null;elements.addBtn.innerText="➕ Add Task";collapseCard()}
function toast(message,type="success"){const div=document.createElement("div");div.className="toast shadow-xl";if(type==="error"){div.style.borderLeftColor="#ef4444"}
div.innerText=message;elements.toastBox.appendChild(div);setTimeout(()=>{div.style.opacity="0";div.style.transform="translateY(10px)";div.style.transition="0.25s";setTimeout(()=>div.remove(),250)},2000)}
function toggleTheme(){document.body.classList.toggle("dark")}
function expandCard(){elements.inputCard.classList.remove("collapsed-note");titleInput.placeholder="What needs to be done?"}
function collapseCard(){if(elements.title.value.trim()||elements.description.value.trim()||editTaskId!==null){return}
elements.inputCard.classList.add("collapsed-note");titleInput.placeholder="Take a note..."}
function bindEvents(){elements.addBtn.addEventListener("click",saveTask);elements.clearBtn.addEventListener("click",clearForm);elements.search.addEventListener("input",searchTasks);elements.themeBtn.addEventListener("click",toggleTheme);elements.inputCard.addEventListener("click",()=>{expandCard()});document.addEventListener("click",(e)=>{if(!elements.inputCard.contains(e.target)){collapseCard()}})}