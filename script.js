
const STORAGE_KEY = "almajd_school_v3";

const starterData = {
  classes: [
    { id: 1, name: "الأول الابتدائي أ" },
    { id: 2, name: "الثاني الابتدائي ب" },
    { id: 3, name: "الثالث الابتدائي أ" }
  ],
  parents: [
    { id: 1, name: "محمد العتيبي", phone: "0500000000" },
    { id: 2, name: "سعد الدوسري", phone: "0550000000" }
  ],
  students: [
    { id: 1, name: "أحمد محمد العتيبي", classId: 1, parentId: 1 },
    { id: 2, name: "خالد محمد العتيبي", classId: 2, parentId: 1 },
    { id: 3, name: "تركي سعد الدوسري", classId: 3, parentId: 2 }
  ],
  teachers: [
    { id: 1, name: "أحمد القحطاني", classId: 1 },
    { id: 2, name: "خالد الحربي", classId: 2 }
  ],
  schedules: [],
  requests: []
};

let data;
let currentUser = null;
let currentRole = null;
let pickupPlace = "بوابة المدرسة";
let channel = null;
let toastTimer = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    data = saved ? JSON.parse(saved) : clone(starterData);
  } catch (error) {
    data = clone(starterData);
  }

  if (!data || !Array.isArray(data.classes)) {
    data = clone(starterData);
  }

  saveData(false);
}

function saveData(broadcast = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  if (broadcast && channel) {
    channel.postMessage({ type: "data-updated" });
  }

  renderAll();
}

function setupLiveSync() {
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel("almajd-school-live");

    channel.onmessage = event => {
      if (event.data?.type === "data-updated") {
        loadFromStorage();
      }
    };
  }

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      loadFromStorage();
    }
  });
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) data = JSON.parse(saved);
    renderAll();
  } catch (error) {
    showToast("تعذر تحديث البيانات");
  }
}

function id() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function className(classId) {
  return data.classes.find(c => c.id === Number(classId))?.name || "فصل غير محدد";
}

function parentName(parentId) {
  return data.parents.find(p => p.id === Number(parentId))?.name || "غير مرتبط";
}

function studentName(studentId) {
  return data.students.find(s => s.id === Number(studentId))?.name || "طالب محذوف";
}

function getTeacher() {
  if (!currentUser) return null;

  return data.teachers.find(t =>
    t.name.trim() === currentUser.trim()
  ) || null;
}

function getParent() {
  if (!currentUser) return null;

  return data.parents.find(p =>
    p.name.trim() === currentUser.trim()
  ) || null;
}

function login() {
  const role = document.getElementById("loginRole").value;
  const name = document.getElementById("loginName").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!name) {
    showToast("اكتب اسم المستخدم أولاً");
    return;
  }

  if (password !== "1234") {
    showToast("كلمة المرور التجريبية هي 1234");
    return;
  }

  if (role === "teacher" &&
      !data.teachers.some(t => t.name === name)) {
    showToast("اسم المعلم غير موجود في بيانات المدرسة");
    return;
  }

  if (role === "parent" &&
      !data.parents.some(p => p.name === name)) {
    showToast("ولي الأمر غير موجود في بيانات المدرسة");
    return;
  }

  currentUser = name;
  currentRole = role;

  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("userName").textContent = name;
  document.getElementById("userAvatar").textContent = name.charAt(0);
  document.getElementById("userRole").textContent = roleLabel(role);

  document.querySelectorAll(".menu").forEach(button => {
    const roles = button.dataset.role;

    button.classList.remove("hidden");

    if (roles && !roles.split(",").includes(role)) {
      button.classList.add("hidden");
    }
  });

  renderAll();

  const startPage = {
    admin: "dashboard",
    duty: "monitor",
    teacher: "teacher",
    parent: "parent",
    board: "board"
  }[role];

  navigate(startPage);
  showToast("مرحباً بك في نظام المجد الجديد");
}

function roleLabel(role) {
  return {
    admin: "الإدارة العليا",
    teacher: "المعلم",
    parent: "ولي الأمر",
    duty: "المراقبة",
    board: "الصبورة الذكية"
  }[role] || role;
}

function logout() {
  currentUser = null;
  currentRole = null;

  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginPassword").value = "";
}

function navigate(page, button) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.add("hidden");
  });

  const target = document.getElementById(page);
  if (!target) return;

  target.classList.remove("hidden");

  document.querySelectorAll(".menu").forEach(menu => {
    menu.classList.remove("active");
  });

  const activeButton = button ||
    document.querySelector(`.menu[data-page="${page}"]`);

  if (activeButton) activeButton.classList.add("active");

  const titles = {
    dashboard: "الرئيسية",
    admin: "إدارة المدرسة",
    parents: "أولياء الأمور",
    schedule: "جدول المعلمين",
    monitor: "المراقبة",
    teacher: "لوحة المعلم",
    parent: "بوابة ولي الأمر",
    board: "الصبورة الذكية"
  };

  document.getElementById("pageTitle").textContent = titles[page] || "المجد الجديد";

  renderAll();
}

/* إدارة الفصول */

function addClass() {
  const input = document.getElementById("newClassName");
  const name = input.value.trim();

  if (!name) return showToast("اكتب اسم الفصل");

  if (data.classes.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return showToast("هذا الفصل موجود بالفعل");
  }

  data.classes.push({ id: id(), name });
  input.value = "";

  saveData();
  showToast("تمت إضافة الفصل");
}

function editClass(classId) {
  const item = data.classes.find(c => c.id === classId);
  if (!item) return;

  const newName = prompt("اكتب اسم الفصل الجديد:", item.name);
  if (newName === null) return;

  const name = newName.trim();
  if (!name) return showToast("اسم الفصل لا يمكن أن يكون فارغاً");

  if (data.classes.some(c => c.id !== classId &&
      c.name.toLowerCase() === name.toLowerCase())) {
    return showToast("يوجد فصل بهذا الاسم");
  }

  item.name = name;
  saveData();
  showToast("تم تعديل اسم الفصل");
}

function deleteClass(classId) {
  const hasStudents = data.students.some(s => s.classId === classId);
  const hasTeachers = data.teachers.some(t => t.classId === classId);

  if (hasStudents || hasTeachers) {
    return showToast("انقل الطلاب والمعلمين من الفصل قبل حذفه");
  }

  if (!confirm("هل تريد حذف هذا الفصل؟")) return;

  data.classes = data.classes.filter(c => c.id !== classId);
  saveData();
  showToast("تم حذف الفصل");
}

/* إدارة الطلاب */

function addStudent() {
  const name = document.getElementById("studentName").value.trim();
  const classId = Number(document.getElementById("studentClass").value);
  const parentId = Number(document.getElementById("studentParent").value);

  if (!name || !classId || !parentId) {
    return showToast("أكمل اسم الطالب والفصل وولي الأمر");
  }

  data.students.push({
    id: id(),
    name,
    classId,
    parentId
  });

  document.getElementById("studentName").value = "";
  saveData();
  showToast("تمت إضافة الطالب وربطه بولي الأمر");
}

function editStudent(studentId) {
  const student = data.students.find(s => s.id === studentId);
  if (!student) return;

  const name = prompt("اسم الطالب:", student.name);
  if (name === null) return;

  if (!name.trim()) return showToast("اسم الطالب مطلوب");

  const newClass = prompt(
    "رقم الفصل:\n" +
    data.classes.map(c => `${c.id} - ${c.name}`).join("\n"),
    String(student.classId)
  );

  if (newClass === null) return;

  const classId = Number(newClass);
  if (!data.classes.some(c => c.id === classId)) {
    return showToast("رقم الفصل غير صحيح");
  }

  student.name = name.trim();
  student.classId = classId;

  saveData();
  showToast("تم تعديل بيانات الطالب");
}

function linkStudentParent(studentId) {
  const student = data.students.find(s => s.id === studentId);
  if (!student) return;

  const options = data.parents.map(p =>
    `${p.id} - ${p.name} (${p.phone})`
  ).join("\n");

  const selected = prompt(
    "اختر رقم ولي الأمر لربط الطالب به:\n" + options,
    String(student.parentId || "")
  );

  if (selected === null) return;

  const parentId = Number(selected);
  if (!data.parents.some(p => p.id === parentId)) {
    return showToast("رقم ولي الأمر غير صحيح");
  }

  student.parentId = parentId;
  saveData();
  showToast("تم ربط الطالب بولي الأمر");
}

function deleteStudent(studentId) {
  if (!confirm("هل تريد حذف هذا الطالب؟")) return;

  data.students = data.students.filter(s => s.id !== studentId);
  data.requests = data.requests.filter(r => r.studentId !== studentId);

  saveData();
  showToast("تم حذف الطالب");
}

/* إدارة أولياء الأمور */

function addParent() {
  const name = document.getElementById("parentName").value.trim();
  const phone = document.getElementById("parentPhone").value.trim();

  if (!name || !phone) return showToast("أدخل الاسم ورقم الجوال");

  if (!/^05\d{8}$/.test(phone)) {
    return showToast("رقم الجوال السعودي يجب أن يبدأ بـ 05 ويتكون من 10 أرقام");
  }

  if (data.parents.some(p => p.phone === phone)) {
    return showToast("رقم الجوال مسجل مسبقاً");
  }

  data.parents.push({ id: id(), name, phone });

  document.getElementById("parentName").value = "";
  document.getElementById("parentPhone").value = "";

  saveData();
  showToast("تمت إضافة ولي الأمر");
}

function editParent(parentId) {
  const parent = data.parents.find(p => p.id === parentId);
  if (!parent) return;

  const name = prompt("اسم ولي الأمر:", parent.name);
  if (name === null) return;

  const phone = prompt("رقم الجوال:", parent.phone);
  if (phone === null) return;

  if (!name.trim() || !/^05\d{8}$/.test(phone.trim())) {
    return showToast("تحقق من الاسم ورقم الجوال");
  }

  if (data.parents.some(p => p.id !== parentId && p.phone === phone.trim())) {
    return showToast("رقم الجوال مستخدم لحساب آخر");
  }

  parent.name = name.trim();
  parent.phone = phone.trim();

  saveData();
  showToast("تم تعديل بيانات ولي الأمر");
}

function deleteParent(parentId) {
  if (data.students.some(s => s.parentId === parentId)) {
    return showToast("لا يمكن حذف ولي الأمر قبل إعادة ربط أبنائه");
  }

  if (!confirm("هل تريد حذف ولي الأمر؟")) return;

  data.parents = data.parents.filter(p => p.id !== parentId);
  saveData();
  showToast("تم حذف ولي الأمر");
}

/* إدارة المعلمين */

function addTeacher() {
  const name = document.getElementById("teacherName").value.trim();
  const classId = Number(document.getElementById("teacherClass").value);

  if (!name || !classId) return showToast("أدخل اسم المعلم والفصل");

  if (data.teachers.some(t => t.name === name)) {
    return showToast("المعلم مسجل بالفعل");
  }

  data.teachers.push({ id: id(), name, classId });
  document.getElementById("teacherName").value = "";

  saveData();
  showToast("تمت إضافة المعلم");
}

function deleteTeacher(teacherId) {
  if (!confirm("هل تريد حذف المعلم؟")) return;

  data.teachers = data.teachers.filter(t => t.id !== teacherId);
  data.schedules = data.schedules.filter(s => s.teacherId !== teacherId);

  saveData();
  showToast("تم حذف المعلم");
}

/* جدول المعلمين */

function addSchedule() {
  const teacherId = Number(document.getElementById("scheduleTeacher").value);
  const classId = Number(document.getElementById("scheduleClass").value);
  const day = document.getElementById("scheduleDay").value;
  const period = document.getElementById("schedulePeriod").value;

  if (!teacherId || !classId) return showToast("حدد المعلم والفصل");

  data.schedules.push({
    id: id(),
    teacherId,
    classId,
    day,
    period
  });

  saveData();
  showToast("تم حفظ الحصة في الجدول");
}

function deleteSchedule(scheduleId) {
  data.schedules = data.schedules.filter(s => s.id !== scheduleId);
  saveData();
}

/* طلبات الخروج */

function sendRequest() {
  const studentId = Number(document.getElementById("parentStudent").value);
  const student = data.students.find(s => s.id === studentId);

  if (!student) return showToast("لم يتم العثور على الطالب");

  const existing = data.requests.find(r =>
    r.studentId === studentId &&
    r.status !== "تم التسليم"
  );

  if (existing) return showToast("يوجد طلب خروج نشط لهذا الطالب");

  data.requests.unshift({
    id: id(),
    studentId,
    parentId: student.parentId,
    classId: student.classId,
    pickup: document.getElementById("pickupLocation").value,
    status: "بانتظار الطالب",
    createdAt: Date.now(),
    arrivedAt: null,
    readyAt: null,
    deliveredAt: null
  });

  saveData();
  showToast("تم إرسال الطلب إلى صبورة الفصل");
}

function markComing(requestId) {
  const request = data.requests.find(r => r.id === requestId);
  if (!request || request.status !== "بانتظار الطالب") return;

  request.status = "الطالب قادم";
  request.arrivedAt = Date.now();

  saveData();
  showToast("تم تأكيد قدوم الطالب");
}

function markReady(requestId) {
  const request = data.requests.find(r => r.id === requestId);
  if (!request || !["الطالب قادم", "متأخر"].includes(displayStatus(request))) return;

  request.status = "الطالب جاهز";
  request.readyAt = Date.now();

  saveData();
  showToast("تم تسجيل جاهزية الطالب");
}

function markDelivered(requestId) {
  const request = data.requests.find(r => r.id === requestId);
  if (!request || request.status !== "الطالب جاهز") return;

  if (!confirm("تأكد من هوية الشخص المخول باستلام الطالب. هل تم التسليم؟")) return;

  request.status = "تم التسليم";
  request.deliveredAt = Date.now();

  saveData();
  showToast("تم تأكيد تسليم الطالب");
}

function isLate(request) {
  return request.status === "بانتظار الطالب" &&
    Date.now() - request.createdAt >= 5 * 60 * 1000;
}

function displayStatus(request) {
  if (isLate(request)) return "متأخر";
  return request.status;
}

function statusClass(status) {
  return {
    "بانتظار الطالب": "waiting",
    "متأخر": "late",
    "الطالب قادم": "coming",
    "الطالب جاهز": "ready",
    "تم التسليم": "done"
  }[status] || "waiting";
}

function timeText(timestamp) {
  return new Date(timestamp).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function elapsedText(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/* عرض الصبورة */

function renderBoard() {
  const classId = Number(document.getElementById("boardClass").value);

  const requests = data.requests.filter(r =>
    r.classId === classId &&
    r.status !== "تم التسليم"
  );

  const container = document.getElementById("boardList");

  if (!requests.length) {
    container.innerHTML = '<div class="board-empty">لا توجد طلبات خروج لهذا الفصل حالياً</div>';
    return;
  }

  container.innerHTML = requests.map(request => {
    const status = displayStatus(request);

    let action = "";

    if (request.status === "بانتظار الطالب") {
      action = `
        <button class="primary" onclick="markComing(${request.id})">
          ✓ أنا قادم
        </button>
      `;
    } else if (status === "متأخر") {
      action = '<div class="alert-box">انتهى وقت الاستجابة. يرجى مراجعة المعلم.</div>';
    } else if (request.status === "الطالب قادم") {
      action = '<span class="badge coming">تم تأكيد القدوم</span>';
    } else {
      action = '<span class="badge ready">الطالب جاهز</span>';
    }

    return `
      <div class="board-student">
        <h3>${escapeHTML(studentName(request.studentId))}</h3>
        <span class="badge ${statusClass(status)}">${escapeHTML(status)}</span>
        <p>وقت الطلب: ${timeText(request.createdAt)}</p>
        ${action}
      </div>
    `;
  }).join("");
}

/* واجهات العرض */

function fillSelect(idName, items, selectedValue = "") {
  const select = document.getElementById(idName);
  if (!select) return;

  const previous = selectedValue || select.value;

  select.innerHTML = items.map(item =>
    `<option value="${item.value}">${escapeHTML(item.label)}</option>`
  ).join("");

  if (items.some(item => String(item.value) === String(previous))) {
    select.value = previous;
  }
}

function renderAdmin() {
  fillSelect("studentClass", data.classes.map(c => ({
    value: c.id, label: c.name
  })));

  fillSelect("teacherClass", data.classes.map(c => ({
    value: c.id, label: c.name
  })));

  fillSelect("studentParent", data.parents.map(p => ({
    value: p.id, label: `${p.name} - ${p.phone}`
  })));

  document.getElementById("classesList").innerHTML =
    data.classes.map(c => `
      <div class="item">
        <div>
          <b>${escapeHTML(c.name)}</b>
          <small>${data.students.filter(s => s.classId === c.id).length} طالب</small>
        </div>
        <div class="actions">
          <button class="action blue" onclick="editClass(${c.id})">تعديل</button>
          <button class="action red" onclick="deleteClass(${c.id})">حذف</button>
        </div>
      </div>
    `).join("") || '<p class="empty">لا توجد فصول</p>';

  document.getElementById("studentsList").innerHTML =
    data.students.map(s => `
      <tr>
        <td>${escapeHTML(s.name)}</td>
        <td>${escapeHTML(className(s.classId))}</td>
        <td>${escapeHTML(parentName(s.parentId))}</td>
        <td>
          <button class="action blue" onclick="editStudent(${s.id})">تعديل</button>
          <button class="action gray" onclick="linkStudentParent(${s.id})">ربط ولي أمر</button>
          <button class="action red" onclick="deleteStudent(${s.id})">حذف</button>
        </td>
      </tr>
    `).join("") || '<tr><td colspan="4">لا يوجد طلاب</td></tr>';

  document.getElementById("teachersList").innerHTML =
    data.teachers.map(t => `
      <div class="item">
        <div><b>${escapeHTML(t.name)}</b><small>${escapeHTML(className(t.classId))}</small></div>
        <button class="action red" onclick="deleteTeacher(${t.id})">حذف</button>
      </div>
    `).join("") || '<p class="empty">لا يوجد معلمون</p>';
}

function renderParents() {
  document.getElementById("parentsList").innerHTML =
    data.parents.map(p => {
      const children = data.students.filter(s => s.parentId === p.id);

      return `
        <div class="item">
          <div>
            <b>${escapeHTML(p.name)}</b>
            <small>📱 ${escapeHTML(p.phone)}</small>
            <small>الأبناء: ${children.map(s => escapeHTML(s.name)).join("، ") || "لا يوجد أبناء مرتبطون"}</small>
          </div>
          <div class="actions">
            <button class="action blue" onclick="editParent(${p.id})">تعديل</button>
            <button class="action red" onclick="deleteParent(${p.id})">حذف</button>
          </div>
        </div>
      `;
    }).join("") || '<p class="empty">لا توجد بيانات</p>';
}

function renderSchedule() {
  fillSelect("scheduleTeacher", data.teachers.map(t => ({
    value: t.id, label: t.name
  })));

  fillSelect("scheduleClass", data.classes.map(c => ({
    value: c.id, label: c.name
  })));

  document.getElementById("scheduleList").innerHTML =
    data.schedules.map(s => {
      const teacher = data.teachers.find(t => t.id === s.teacherId);

      return `
        <div class="item">
          <div>
            <b>${escapeHTML(teacher?.name || "معلم محذوف")}</b>
            <small>${escapeHTML(s.day)} · ${escapeHTML(className(s.classId))} · ${escapeHTML(s.period)}</small>
          </div>
          <button class="action red" onclick="deleteSchedule(${s.id})">حذف</button>
        </div>
      `;
    }).join("") || '<p class="empty">لم تتم إضافة جدول بعد</p>';
}

function renderMonitor() {
  const active = data.requests.filter(r => r.status !== "تم التسليم");
  const late = active.filter(isLate);
  const waiting = active.filter(r => r.status === "بانتظار الطالب");

  document.getElementById("monitorActive").textContent = active.length;
  document.getElementById("monitorWaiting").textContent = waiting.length;
  document.getElementById("monitorLate").textContent = late.length;
  document.getElementById("monitorDone").textContent =
    data.requests.filter(r => r.status === "تم التسليم").length;

  const search = document.getElementById("monitorSearch")?.value.trim() || "";

  const filtered = data.requests.filter(r =>
    studentName(r.studentId).includes(search)
  );

  document.getElementById("monitorList").innerHTML =
    filtered.map(r => {
      const status = displayStatus(r);

      return `
        <div class="request-card">
          <div>
            <b>${escapeHTML(studentName(r.studentId))}</b>
            <small>${escapeHTML(className(r.classId))} · ${escapeHTML(parentName(r.parentId))}</small>
            <small>${escapeHTML(r.pickup)} · وقت الطلب: ${timeText(r.createdAt)}</small>
            ${isLate(r) ? `<div class="alert-box">⚠️ الطالب متأخر منذ ${elapsedText(r.createdAt)}</div>` : ""}
          </div>
          <span class="badge ${statusClass(status)}">${escapeHTML(status)}</span>
          <div class="actions">
            ${r.status === "الطالب قادم" || isLate(r)
              ? `<button class="action green" onclick="markReady(${r.id})">الطالب جاهز</button>`
              : ""}
            ${r.status === "الطالب جاهز"
              ? `<button class="action green" onclick="markDelivered(${r.id})">تأكيد التسليم</button>`
              : ""}
          </div>
        </div>
      `;
    }).join("") || '<p class="empty">لا توجد طلبات</p>';
}

function renderTeacher() {
  const teacher = getTeacher();
  const info = document.getElementById("teacherInfo");

  if (!teacher) {
    info.innerHTML = '<div class="alert-box">هذا الحساب غير مرتبط بمعلم في بيانات المدرسة.</div>';
    document.getElementById("teacherList").innerHTML = "";
    return;
  }

  const today = new Date().toLocaleDateString("ar-SA", { weekday: "long" });

  const todaySchedule = data.schedules.filter(s =>
    s.teacherId === teacher.id && s.day === today
  );

  info.innerHTML = `
    <div class="item">
      <div>
        <b>${escapeHTML(teacher.name)}</b>
        <small>الفصل الأساسي: ${escapeHTML(className(teacher.classId))}</small>
        <small>اليوم: ${escapeHTML(today)}</small>
      </div>
    </div>
    ${todaySchedule.map(s => `
      <div class="item">
        <b>${escapeHTML(s.period)}</b>
        <small>${escapeHTML(className(s.classId))}</small>
      </div>
    `).join("") || '<p class="empty">لا يوجد جدول مسجل لهذا اليوم</p>'}
  `;

  const requests = data.requests.filter(r =>
    r.classId === teacher.classId &&
    r.status !== "تم التسليم"
  );

  document.getElementById("teacherList").innerHTML =
    requests.map(r => {
      const status = displayStatus(r);

      return `
        <div class="request-card">
          <div>
            <b>${escapeHTML(studentName(r.studentId))}</b>
            <small>${escapeHTML(status)}</small>
            ${isLate(r) ? `<div class="alert-box">تنبيه: الطالب لم يؤكد قدومه خلال خمس دقائق</div>` : ""}
          </div>
          <div class="actions">
            ${r.status === "الطالب قادم" || isLate(r)
              ? `<button class="action green" onclick="markReady(${r.id})">الطالب جاهز</button>`
              : ""}
          </div>
        </div>
      `;
    }).join("") || '<p class="empty">لا توجد طلبات لهذا الفصل</p>';
}

function renderParent() {
  const parent = getParent();
  const select = document.getElementById("parentStudent");

  if (!parent) {
    select.innerHTML = "";
    document.getElementById("parentHistory").innerHTML =
      '<div class="alert-box">تعذر العثور على ولي الأمر.</div>';
    return;
  }

  const children = data.students.filter(s => s.parentId === parent.id);

  fillSelect("parentStudent", children.map(s => ({
    value: s.id,
    label: `${s.name} - ${className(s.classId)}`
  })));

  const history = data.requests.filter(r => r.parentId === parent.id);

  document.getElementById("parentHistory").innerHTML = `
    <h3>طلبات أبنائك</h3>
    ${history.map(r => `
      <div class="item">
        <div>
          <b>${escapeHTML(studentName(r.studentId))}</b>
          <small>${escapeHTML(className(r.classId))}</small>
        </div>
        <span class="badge ${statusClass(displayStatus(r))}">${escapeHTML(displayStatus(r))}</span>
      </div>
    `).join("") || '<p class="empty">لا توجد طلبات سابقة</p>'}
  `;
}

function renderBoardSelect() {
  fillSelect("boardClass", data.classes.map(c => ({
    value: c.id,
    label: c.name
  })));

  renderBoard();
}

function renderDashboard() {
  document.getElementById("statStudents").textContent = data.students.length;
  document.getElementById("statClasses").textContent = data.classes.length;

  const active = data.requests.filter(r => r.status !== "تم التسليم");

  document.getElementById("statActive").textContent = active.length;
  document.getElementById("statLate").textContent = active.filter(isLate).length;

  document.getElementById("recentRequests").innerHTML =
    data.requests.slice(0, 6).map(r => `
      <div class="item">
        <div>
          <b>${escapeHTML(studentName(r.studentId))}</b>
          <small>${escapeHTML(className(r.classId))}</small>
        </div>
        <span class="badge ${statusClass(displayStatus(r))}">${escapeHTML(displayStatus(r))}</span>
      </div>
    `).join("") || '<p class="empty">لا توجد طلبات حتى الآن</p>';
}

function renderAll() {
  if (!data) return;

  renderDashboard();
  renderAdmin();
  renderParents();
  renderSchedule();
  renderMonitor();
  renderTeacher();
  renderParent();
  renderBoardSelect();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function updateDate() {
  const element = document.getElementById("today");
  if (!element) return;

  element.textContent = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/* تشغيل النظام */

loadData();
setupLiveSync();
updateDate();
renderAll();

setInterval(() => {
  if (!currentUser) return;

  renderDashboard();
  renderMonitor();
  renderTeacher();
  renderParent();
  renderBoard();
}, 1000);
