const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const isMatch = require("date-fns/isMatch");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const getResponseObjects = (todoObject) => {
  return {
    id: todoObject.id,
    todo: todoObject.todo,
    priority: todoObject.priority,
    status: todoObject.status,
    category: todoObject.category,
    dueDate: todoObject.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  let data;
  let getTodoQuery = "";
  const { status, priority, category, search_q = "" } = request.query;
  console.log(status);

  if (hasStatusProperty(request.query) === true) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      getTodoQuery = `SELECT * FROM todo
                             WHERE todo LIKE "%${search_q}%"
                                AND status =  "${status}" ;`;
      data = await db.all(getTodoQuery);
      response.send(data.map((eachData) => getResponseObjects(eachData)));
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (hasPriorityProperty(request.query) === true) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      getTodoQuery = `SELECT * FROM todo
                             WHERE todo LIKE "${search_q}%" 
                               AND   priority = "${priority}" ;`;
      data = await db.all(getTodoQuery);
      response.send(data.map((eachData) => getResponseObjects(eachData)));
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (hasPriorityAndStatusProperty(request.query)) {
    getTodoQuery = `SELECT * FROM todo
                             WHERE todo LIKE "%${search_q}%"
                                AND priority = "${priority}"
                                AND status =  "${status}" ;`;
    data = await db.all(getTodoQuery);
    response.send(data.map((eachData) => getResponseObjects(eachData)));
  } else if (hasCategoryAndStatusProperty(request.query) === true) {
    getTodoQuery = `SELECT * FROM todo
                            WHERE category = "${category}"
                            AND status =  "${status}" ; `;
    data = await db.all(getTodoQuery);
    response.send(data.map((eachData) => getResponseObjects(eachData)));
  } else if (hasCategoryProperty(request.query) === true) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      getTodoQuery = `SELECT * FROM todo
                            WHERE category = "${category}" ;`;
      data = await db.all(getTodoQuery);
      response.send(data.map((eachData) => getResponseObjects(eachData)));
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (hasCategoryAndPriority(request.query) === true) {
    getTodoQuery = `SELECT * FROM todo
                            WHERE category = "${category}"
                            AND priority = "${priority}" ;`;
    data = await db.all(getTodoQuery);
    response.send(data.map((eachData) => getResponseObjects(eachData)));
  } else {
    getTodoQuery = `SELECT * FROM todo
                             WHERE todo LIKE "%${search_q}%";`;
    data = await db.all(getTodoQuery);
    response.send(data.map((eachData) => getResponseObjects(eachData)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId} ;`;
  const todoObject = await db.get(getTodoQuery);
  const responseObject = {
    id: todoObject.id,
    todo: todoObject.todo,
    priority: todoObject.priority,
    status: todoObject.status,
    category: todoObject.category,
    dueDate: todoObject.due_date,
  };
  response.send(responseObject);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  console.log(isMatch(date, "yyyy-MM-dd"));
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const getAgendaQuery = `SELECT * FROM todo WHERE due_date = "${newDate}";`;
    const responseList = await db.all(getAgendaQuery);
    response.send(responseList.map((eachData) => getResponseObjects(eachData)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (isMatch(dueDate, "yyyy-MM-dd")) {
          newDate = format(new Date(dueDate), "yyyy-MM-dd");
          const createTodoQuery = `INSERT INTO todo(id,todo,priority,status,category,due_date)
                                            VALUES(${id}, "${todo}" ,"${priority}" ,"${status}" ,"${category}" ,"${newDate}" );`;
          await db.run(createTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const { status, priority, todo, category, dueDate } = request.body;
  console.log(status);

  if (status !== undefined) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      const updateQuery = `UPDATE todo SET status = "${status}" WHERE id = ${todoId} ;`;
      await db.run(updateQuery);
      response.send("Status Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      const updateQuery = `UPDATE todo SET priority = "${priority}" WHERE id = ${todoId} ;`;
      await db.run(updateQuery);
      response.send("Priority Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (todo !== undefined) {
    const updateQuery = `UPDATE todo SET todo = "${todo}" WHERE id = ${todoId} ;`;
    await db.run(updateQuery);
    response.send("Todo Updated");
  } else if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      const updateQuery = `UPDATE todo SET category = "${category}" WHERE id = ${todoId} ;`;
      await db.run(updateQuery);
      response.send("Category Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (dueDate !== undefined) {
    if (isMatch(dueDate, "yyyy-MM-dd")) {
      const newDate = format(new Date(dueDate), "yyyy-MM-dd");
      const updateQuery = `UPDATE todo SET due_date = "${newDate}" WHERE id = ${todoId} ;`;
      await db.run(updateQuery);
      response.send("Due Date Updated");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId} ;`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
